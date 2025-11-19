'use client'

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'

// Constants matching the launcher exactly
const MOD_WIDTH = 240
const MOD_HEIGHT = 80
const MOD_GAP = 10
const CATEGORY_HEADER_HEIGHT = 40
const CATEGORY_PADDING_TOP = 8
const CATEGORY_PADDING_BOTTOM = 8
const CATEGORY_WIDTH = 255 // 240 + 15
const GRID_SPACING_BASE = 32

// Zoom limits
const MIN_SCALE = 0.25
const MAX_SCALE = 2

// Types
type ModrinthMod = {
  project_id: string
  title: string
  icon_url: string
  description?: string
  slug: string
}

type BoardMod = {
  id: string
  mod: ModrinthMod
  x: number
  y: number
  categoryId?: string
  categoryIndex?: number
}

type Category = {
  id: string
  title: string
  x: number
  y: number
  color1: string
  color2: string
  modIds: string[]
  isCollapsed?: boolean
}

type ContextMenuState = {
  x: number
  y: number
  type: 'board' | 'category' | 'mod'
  id?: string
} | null

// Helper to get average color (simulated)
function getAverageColor(imageUrl: string): string {
  const colorMap: Record<string, string> = {
    'YL57xq9U': '#8d5bff', // Iris
    'AANobbMI': '#5fd598', // Sodium
    'NNAgCjsB': '#5cc0ff', // Fabric API
    'P7dR8mSH': '#ff9500', // Fabric API (Modrinth ID)
    'ha28R6CL': '#F0A136', // Fabric Language Kotlin
  }
  
  for (const [key, color] of Object.entries(colorMap)) {
    if (imageUrl.includes(key)) return color
  }
  
  // Generate deterministic color based on string hash if not found
  let hash = 0;
  for (let i = 0; i < imageUrl.length; i++) {
    hash = imageUrl.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 60%)`;
}

// API Mock
async function loadPopularMods(): Promise<ModrinthMod[]> {
  try {
    const params = new URLSearchParams({
      query: '',
      limit: '8',
      facets: JSON.stringify([['project_type:mod']])
    })
    
    const response = await fetch(`https://api.modrinth.com/v2/search?${params}`)
    if (!response.ok) throw new Error('Failed to load mods')
    
    const data = await response.json()
    return data.hits.map((hit: any) => ({
      project_id: hit.project_id,
      title: hit.title,
      icon_url: hit.icon_url || '',
      description: hit.description,
      slug: hit.slug
    }))
  } catch (error) {
    console.error('Load mods error:', error)
    return []
  }
}

export default function MiniBoardDemo() {
  // Refs
  const boardRef = useRef<HTMLDivElement | null>(null)
  const searchPanelRef = useRef<HTMLDivElement | null>(null)
  
  // Dragging State
  const dragRef = useRef<{ 
    id: string; 
    startX: number; 
    startY: number; 
    initialItemX: number; 
    initialItemY: number; 
    type: 'mod' | 'category' | 'pan' 
  } | null>(null)

  // View State (Camera)
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 })
  
  // Content State
  const [mods, setMods] = useState<BoardMod[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  
  // UI State
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<ModrinthMod[]>([])
  const [isLoadingMods, setIsLoadingMods] = useState(false)
  const [draggingModFromSearch, setDraggingModFromSearch] = useState<ModrinthMod | null>(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Load initial mods
  useEffect(() => {
    if (isSearchOpen && searchResults.length === 0 && !isLoadingMods) {
      setIsLoadingMods(true)
      loadPopularMods().then(mods => {
        setSearchResults(mods)
        setIsLoadingMods(false)
      })
    }
  }, [isSearchOpen])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedIds.size === 0) return
      
      // Delete selected
      setCategories(prev => prev.filter(c => !selectedIds.has(c.id)))
      setMods(prev => prev.filter(m => !selectedIds.has(m.id)))
      
      // Also cleanup mods inside deleted categories
      // (Wait, mods are separate entities, but if category is deleted, mods should be uncategorized or deleted?
      // In launcher they are usually released. Let's release them.)
      const deletedCatIds = Array.from(selectedIds).filter(id => id.startsWith('cat_'))
      if (deletedCatIds.length > 0) {
         setMods(prev => prev.map(m => deletedCatIds.includes(m.categoryId || '') ? { ...m, categoryId: undefined } : m))
      }
      
      setSelectedIds(new Set())
    }
  }, [selectedIds])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  // ... Zoom & Pan Logic ...

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Zoom disabled per user request
    // We can allow default behavior (page scroll) or just do nothing
    // If we want to prevent page scroll while hovering the board, we keep preventDefault
    // but do no logic.
    // However, usually if a component doesn't scroll/zoom, we want the page to scroll.
    // So I will remove the preventDefault and logic entirely unless dragging.
    if (draggingModFromSearch) return
    
    // Optional: If we want to allow panning with wheel? 
    // User said "only movement", usually implies dragging.
    // For now, I'll just let the event bubble up so the user can scroll the page past the demo.
  }, [draggingModFromSearch])

  const handlePointerDown = (e: React.PointerEvent) => {
    // Middle mouse -> Pan
    if (e.button === 1) {
      e.preventDefault()
      dragRef.current = {
        id: 'camera',
        startX: e.clientX,
        startY: e.clientY,
        initialItemX: view.x,
        initialItemY: view.y,
        type: 'pan'
      }
      document.body.style.cursor = 'grabbing'
      return
    }

    // Context menu close
    if (contextMenu) setContextMenu(null)
  }

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return

    if (dragRef.current.type === 'pan') {
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      const initialX = dragRef.current.initialItemX;
      const initialY = dragRef.current.initialItemY;
      
      setView(v => ({
        ...v,
        x: initialX + dx,
        y: initialY + dy
      }))
      return
    }

    // Logic for Mod/Category dragging (adjusted for scale)
    if (!boardRef.current) return
    const rect = boardRef.current.getBoundingClientRect()
    
    // Current mouse pos in world coordinates
    const mouseX = (e.clientX - rect.left - view.x) / view.scale
    const mouseY = (e.clientY - rect.top - view.y) / view.scale
    
    // Delta in world coordinates
    const deltaX = (e.clientX - dragRef.current.startX) / view.scale
    const deltaY = (e.clientY - dragRef.current.startY) / view.scale

    if (dragRef.current.type === 'category') {
      const catId = dragRef.current.id
      const initialX = dragRef.current.initialItemX;
      const initialY = dragRef.current.initialItemY;
      
      setCategories(prev => prev.map(c => 
        c.id === catId 
          ? { ...c, x: initialX + deltaX, y: initialY + deltaY }
          : c
      ))
    } 
    
    else if (dragRef.current.type === 'mod') {
      const modId = dragRef.current.id
      const initialX = dragRef.current.initialItemX;
      const initialY = dragRef.current.initialItemY;
      
      const newX = initialX + deltaX
      const newY = initialY + deltaY
      
      // Check hover over categories
      let targetCatId: string | null = null
      
      // Only check if we have categories
      if (categories.length > 0) {
        for (const cat of categories) {
           // Simple AABB collision detection
           const catW = CATEGORY_WIDTH
           const catH = 100 + (cat.modIds.length * (MOD_HEIGHT + MOD_GAP)) // Approx height
           
           if (
             mouseX >= cat.x && mouseX <= cat.x + catW &&
             mouseY >= cat.y && mouseY <= cat.y + catH
           ) {
             targetCatId = cat.id
             break
           }
        }
      }
      
      setHoveredCategoryId(targetCatId)
      
      setMods(prev => prev.map(m => 
        m.id === modId 
          ? { ...m, x: newX, y: newY, categoryId: targetCatId || undefined }
          : m
      ))
    }
  }, [view, categories])

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current) return

    if (dragRef.current.type === 'mod' && hoveredCategoryId) {
      // Snap to category logic
      const modId = dragRef.current.id
      setCategories(prev => prev.map(c => 
        c.id === hoveredCategoryId 
          ? { ...c, modIds: [...c.modIds.filter(id => id !== modId), modId] }
          : c
      ))
      // Update mod to reference category
      setMods(prev => prev.map(m => m.id === modId ? { ...m, categoryId: hoveredCategoryId } : m))
    }

    dragRef.current = null
    setHoveredCategoryId(null)
    document.body.style.cursor = ''
  }, [hoveredCategoryId])

  // --- Search Dragging ---
  useEffect(() => {
    if (!draggingModFromSearch) return

    const handleMove = (e: PointerEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY })
    }

    const handleUp = (e: PointerEvent) => {
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect()
        // Convert screen to world coords
        const worldX = (e.clientX - rect.left - view.x) / view.scale - (MOD_WIDTH / 2)
        const worldY = (e.clientY - rect.top - view.y) / view.scale - (MOD_HEIGHT / 2)
        
        // Check boundaries roughly
        if (e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom) {
           const newMod: BoardMod = {
             id: `${draggingModFromSearch.project_id}_${Date.now()}`,
             mod: draggingModFromSearch,
             x: worldX,
             y: worldY
           }
           setMods(prev => [...prev, newMod])
        }
      }
      setDraggingModFromSearch(null)
      document.body.style.cursor = ''
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [draggingModFromSearch, view])

  // --- Context Menu Actions ---
  const handleContextMenu = (e: React.MouseEvent, type: 'board' | 'category' | 'mod', id?: string) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return
    
    setContextMenu({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      type,
      id
    })
  }

  const createCategory = () => {
    if (!contextMenu) return
    const worldX = (contextMenu.x - view.x) / view.scale - (CATEGORY_WIDTH / 2)
    const worldY = (contextMenu.y - view.y) / view.scale
    
    const hue = Math.random() * 360
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      title: 'New Category',
      x: worldX,
      y: worldY,
      color1: `hsl(${hue}, 70%, 60%)`,
      color2: `hsl(${(hue + 30) % 360}, 70%, 55%)`,
      modIds: []
    }
    setCategories(prev => [...prev, newCat])
    setContextMenu(null)
  }
  
  const deleteItem = () => {
    if (!contextMenu?.id) return
    
    if (contextMenu.type === 'category') {
       // Release mods
       setMods(prev => prev.map(m => m.categoryId === contextMenu.id ? { ...m, categoryId: undefined } : m))
       setCategories(prev => prev.filter(c => c.id !== contextMenu.id))
    } else if (contextMenu.type === 'mod') {
       const mod = mods.find(m => m.id === contextMenu.id)
       if (mod?.categoryId) {
          setCategories(prev => prev.map(c => c.id === mod.categoryId ? { ...c, modIds: c.modIds.filter(mid => mid !== mod.id) } : c))
       }
       setMods(prev => prev.filter(m => m.id !== contextMenu.id))
    }
    setContextMenu(null)
  }

  // --- Render Helpers ---
  const gridStyle = useMemo(() => {
    const spacing = GRID_SPACING_BASE * view.scale
    const offsetX = ((view.x % spacing) + spacing) % spacing
    const offsetY = ((view.y % spacing) + spacing) % spacing
    return {
      backgroundImage: `radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)`,
      backgroundSize: `${spacing}px ${spacing}px`,
      backgroundPosition: `${offsetX}px ${offsetY}px`,
      opacity: Math.min(1, view.scale * 0.8) // Fade out grid when zoomed out
    }
  }, [view])

  // Group mods
  const modsByCategory = useMemo(() => {
    const map: Record<string, BoardMod[]> = {}
    categories.forEach(c => {
      map[c.id] = mods.filter(m => m.categoryId === c.id)
    })
    return map
  }, [mods, categories])
  
  const uncategorizedMods = useMemo(() => mods.filter(m => !m.categoryId), [mods])

  return (
    <div 
      ref={boardRef}
      className="relative w-full h-full min-h-[500px] bg-[#0b0e15] rounded-3xl border border-white/10 shadow-2xl overflow-hidden select-none"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => handleContextMenu(e, 'board')}
    >
      {/* Grid Layer */}
      <div className="absolute inset-0 pointer-events-none z-0" style={gridStyle} />
      
      {/* World Container - Transforms applied here */}
      <div 
        className="absolute inset-0 origin-top-left will-change-transform"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      >
        {/* Categories */}
        {categories.map(cat => {
           const catMods = modsByCategory[cat.id] || []
           const height = CATEGORY_HEADER_HEIGHT + CATEGORY_PADDING_TOP + (catMods.length * (MOD_HEIGHT + MOD_GAP)) + CATEGORY_PADDING_BOTTOM
           
           return (
             <div
               key={cat.id}
               style={{
                 position: 'absolute',
                 left: cat.x,
                 top: cat.y,
                 width: CATEGORY_WIDTH,
                 height: height,
                 background: `linear-gradient(135deg, ${cat.color1}22, ${cat.color2}22)`,
                 borderRadius: 16,
                 border: selectedIds.has(cat.id) || hoveredCategoryId === cat.id ? `2px solid ${cat.color1}` : '1px solid rgba(255,255,255,0.1)',
                 backdropFilter: 'blur(12px)',
                 zIndex: selectedIds.has(cat.id) ? 20 : 10
               }}
             >
               {/* Category Header */}
               <div 
                 className="flex items-center justify-between px-3 h-[40px] cursor-grab active:cursor-grabbing border-b border-white/10"
                 style={{ background: `linear-gradient(90deg, ${cat.color1}66, ${cat.color2}66)`, borderRadius: '16px 16px 0 0' }}
                 onPointerDown={(e) => {
                   e.stopPropagation()
                   dragRef.current = {
                     id: cat.id,
                     startX: e.clientX,
                     startY: e.clientY,
                     initialItemX: cat.x,
                     initialItemY: cat.y,
                     type: 'category'
                   }
                   setSelectedIds(new Set([cat.id]))
                 }}
                 onContextMenu={(e) => {
                   handleContextMenu(e, 'category', cat.id)
                   setSelectedIds(new Set([cat.id]))
                 }}
               >
                 <span className="text-white font-bold text-sm truncate">{cat.title}</span>
                 <div className="w-3 h-3 rounded-full" style={{ background: cat.color1 }} />
               </div>
               
               {/* Mods in Category */}
               <div className="p-2 flex flex-col gap-[10px]">
                 {catMods.map(mod => (
                   <div 
                     key={mod.id}
                     style={{
                       height: MOD_HEIGHT,
                       background: `linear-gradient(135deg, ${getAverageColor(mod.mod.icon_url)}aa, rgba(0,0,0,0.6))`,
                       borderRadius: 10,
                       border: '1px solid rgba(255,255,255,0.1)'
                     }}
                     className="flex items-center gap-3 p-3 relative group"
                   >
                     <img src={mod.mod.icon_url || '/favicon.png'} className="w-10 h-10 rounded-md shadow-sm" alt="" />
                     <div className="flex-1 min-w-0">
                       <div className="text-white font-semibold text-sm truncate">{mod.mod.title}</div>
                       <div className="text-white/50 text-[10px] truncate">{mod.mod.slug}</div>
                     </div>
                     <button 
                       className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 text-white/50 hover:text-white"
                       onPointerDown={(e) => {
                         e.stopPropagation()
                         // Instant delete logic for simplicity inside category
                         setMods(prev => prev.filter(m => m.id !== mod.id))
                       }}
                     >
                       ×
                     </button>
                   </div>
                 ))}
               </div>
             </div>
           )
        })}

        {/* Uncategorized Mods */}
        {uncategorizedMods.map(mod => (
          <div
            key={mod.id}
            style={{
              position: 'absolute',
              left: mod.x,
              top: mod.y,
              width: MOD_WIDTH,
              height: MOD_HEIGHT,
              zIndex: 20,
              transform: dragRef.current?.id === mod.id ? 'scale(1.05)' : 'scale(1)',
              transition: dragRef.current?.id === mod.id ? 'none' : 'transform 0.2s',
              cursor: 'grab'
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              if (e.button !== 0) return
              dragRef.current = {
                id: mod.id,
                startX: e.clientX,
                startY: e.clientY,
                initialItemX: mod.x,
                initialItemY: mod.y,
                type: 'mod'
              }
              setSelectedIds(new Set([mod.id]))
            }}
            onContextMenu={(e) => {
              handleContextMenu(e, 'mod', mod.id)
              setSelectedIds(new Set([mod.id]))
            }}
          >
             <div 
               className={`w-full h-full rounded-xl border shadow-lg flex items-center gap-3 p-3 overflow-hidden backdrop-blur-md transition-colors ${selectedIds.has(mod.id) ? 'border-white/60 ring-1 ring-white/50' : 'border-white/20'}`}
               style={{ background: `linear-gradient(135deg, ${getAverageColor(mod.mod.icon_url)}, rgba(10,10,15,0.8))` }}
             >
                <img src={mod.mod.icon_url || '/favicon.png'} className="w-10 h-10 rounded-lg shadow-md bg-black/20" alt="" />
                <div className="flex-1 min-w-0">
                   <div className="text-white font-bold text-sm truncate">{mod.mod.title}</div>
                   <div className="text-white/60 text-xs truncate">{mod.mod.slug}</div>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* UI Overlay (Toolbar, Search, etc) - Fixed position */}
      
      {/* Search Toggle */}
      <button
        onClick={() => setIsSearchOpen(!isSearchOpen)}
        className={`absolute top-6 left-6 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border backdrop-blur-xl z-50 ${isSearchOpen ? 'bg-blue-500/20 border-blue-400/50 text-blue-200' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
      >
        {isSearchOpen ? '×' : '🔍'}
      </button>

      {/* Search Panel */}
      {isSearchOpen && (
        <div className="absolute top-[80px] left-6 w-64 max-h-96 bg-[#1a1d26]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
          <div className="p-3 border-b border-white/5 text-xs font-bold text-white/50 uppercase tracking-wider">
            Add Mods
          </div>
          <div className="overflow-y-auto p-2 gap-2 flex flex-col custom-scrollbar">
            {isLoadingMods ? (
              <div className="text-center text-white/30 py-4 text-xs">Loading...</div>
            ) : (
              searchResults.map(mod => (
                <div 
                  key={mod.project_id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-grab active:cursor-grabbing transition-colors border border-transparent hover:border-white/5"
                  onPointerDown={(e) => {
                    e.preventDefault()
                    setDraggingModFromSearch(mod)
                  }}
                >
                  <img src={mod.icon_url || '/favicon.png'} className="w-8 h-8 rounded bg-black/20" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium truncate">{mod.title}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Toolbar */}
      <div className="absolute top-6 right-6 flex gap-2 z-50">
        {['Updates', 'Export', 'Clear'].map(action => (
          <button 
            key={action}
            className={`px-4 py-2 rounded-lg text-xs font-semibold backdrop-blur-md border transition-all ${
              action === 'Clear' 
                ? 'bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20' 
                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
            }`}
            onClick={() => {
              if (action === 'Clear') { setMods([]); setCategories([]); }
            }}
          >
            {action}
          </button>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="absolute z-[100] min-w-[160px] bg-[#1a1d26] border border-white/10 rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'board' && (
             <button onClick={createCategory} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 flex items-center gap-2">
               <span>📁</span> New Category
             </button>
          )}
          {(contextMenu.type === 'category' || contextMenu.type === 'mod') && (
             <button onClick={deleteItem} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
               <span>🗑️</span> Delete
             </button>
          )}
        </div>
      )}

      {/* Drag Preview (Search) */}
      {draggingModFromSearch && (
        <div 
          className="fixed pointer-events-none z-[9999] p-3 rounded-xl border border-white/20 shadow-2xl flex items-center gap-3 bg-[#1a1d26]/90 backdrop-blur-xl"
          style={{ left: dragPosition.x, top: dragPosition.y, width: MOD_WIDTH }}
        >
           <img src={draggingModFromSearch.icon_url || '/favicon.png'} className="w-10 h-10 rounded-lg" alt="" />
           <div className="text-white font-bold text-sm truncate">{draggingModFromSearch.title}</div>
        </div>
      )}
      
      <div className="absolute bottom-6 right-6 text-white/20 text-[10px] pointer-events-none">
        Use Middle Mouse to Pan
      </div>
    </div>
  )
}
