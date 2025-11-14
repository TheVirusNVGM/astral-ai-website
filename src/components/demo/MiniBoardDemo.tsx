'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

// Exact sizes from launcher (reduced for demo)
const MOD_WIDTH = 180
const MOD_HEIGHT = 60
const GRID_SPACING = 24
const CATEGORY_WIDTH = 240
const CATEGORY_HEADER_HEIGHT = 40
const CATEGORY_PADDING_TOP = 12
const CATEGORY_PADDING_BOTTOM = 12
const MOD_GAP = 8

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
}

// Function to get average color from icon
function getAverageColor(imageUrl: string): string {
  const colorMap: Record<string, string> = {
    'YL57xq9U': '#8d5bff',
    'AANobbMI': '#5fd598',
    'NNAgCjsB': '#5cc0ff',
    'fabric-api': '#ff9500',
  }
  
  for (const [key, color] of Object.entries(colorMap)) {
    if (imageUrl.includes(key)) {
      return color
    }
  }
  
  return '#6b7280'
}

// Load popular mods via Modrinth API
async function loadPopularMods(): Promise<ModrinthMod[]> {
  try {
    const params = new URLSearchParams({
      query: '',
      limit: '5',
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
  const boardRef = useRef<HTMLDivElement | null>(null)
  const searchPanelRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number; type: 'mod' | 'category' } | null>(null)
  const [mods, setMods] = useState<BoardMod[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stars, setStars] = useState<Array<{ x: number; y: number; size: number; delay: number }>>([])
  
  // Search panel state
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<ModrinthMod[]>([])
  const [isLoadingMods, setIsLoadingMods] = useState(false)
  const [draggingModFromSearch, setDraggingModFromSearch] = useState<ModrinthMod | null>(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  
  // Category creation
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null)

  // Генерация звезд
  useEffect(() => {
    const starCount = 30
    const newStars = Array.from({ length: starCount }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 3
    }))
    setStars(newStars)
  }, [])

  // Загрузка популярных модов при открытии панели
  useEffect(() => {
    if (isSearchOpen && searchResults.length === 0 && !isLoadingMods) {
      setIsLoadingMods(true)
      loadPopularMods().then(mods => {
        setSearchResults(mods)
        setIsLoadingMods(false)
      })
    }
  }, [isSearchOpen])

  const clampPosition = (x: number, y: number) => {
    const rect = boardRef.current?.getBoundingClientRect()
    const width = rect?.width ?? 800
    const height = rect?.height ?? 500
    return {
      x: Math.min(Math.max(20, x), width - MOD_WIDTH - 20),
      y: Math.min(Math.max(20, y), height - MOD_HEIGHT - 20)
    }
  }

  // Обработка перетаскивания модов
  const handleModPointerMove = (event: PointerEvent) => {
    if (!dragRef.current || dragRef.current.type !== 'mod' || !boardRef.current) return
    const rect = boardRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left - dragRef.current.offsetX
    const y = event.clientY - rect.top - dragRef.current.offsetY
    
    // Проверка попадания в категорию
    let targetCategoryId: string | null = null
    categories.forEach(cat => {
      const catX = cat.x
      const catY = cat.y
      const catWidth = CATEGORY_WIDTH
      const catHeight = CATEGORY_HEADER_HEIGHT + CATEGORY_PADDING_TOP + 
                        (cat.modIds.length * (MOD_HEIGHT + MOD_GAP)) + 
                        CATEGORY_PADDING_BOTTOM
      
      if (x >= catX && x <= catX + catWidth && y >= catY && y <= catY + catHeight) {
        targetCategoryId = cat.id
      }
    })
    
    setHoveredCategoryId(targetCategoryId)
    
    const next = clampPosition(x, y)
    setMods((prev) =>
      prev.map((mod) =>
        mod.id === dragRef.current?.id ? { ...mod, ...next, categoryId: targetCategoryId || undefined } : mod
      )
    )
  }

  const stopDragging = () => {
    window.removeEventListener('pointermove', handleModPointerMove)
    window.removeEventListener('pointerup', stopDragging)
    
    if (dragRef.current?.type === 'mod' && hoveredCategoryId) {
      // Добавляем мод в категорию
      const mod = mods.find(m => m.id === dragRef.current?.id)
      if (mod) {
        setCategories(prev => prev.map(cat => 
          cat.id === hoveredCategoryId 
            ? { ...cat, modIds: [...cat.modIds, mod.id] }
            : cat
        ))
        setMods(prev => prev.map(m => 
          m.id === mod.id 
            ? { ...m, categoryId: hoveredCategoryId, categoryIndex: categories.find(c => c.id === hoveredCategoryId)?.modIds.length || 0 }
            : m
        ))
      }
    }
    
    dragRef.current = null
    setHoveredCategoryId(null)
    document.body.style.cursor = ''
  }

  const startDraggingMod = (event: React.PointerEvent, id: string) => {
    if (!boardRef.current) return
    const rect = boardRef.current.getBoundingClientRect()
    const mod = mods.find((n) => n.id === id)
    if (!mod) return
    
    // Удаляем из категории если был в ней
    if (mod.categoryId) {
      setCategories(prev => prev.map(cat => 
        cat.id === mod.categoryId 
          ? { ...cat, modIds: cat.modIds.filter(mid => mid !== mod.id) }
          : cat
      ))
    }
    
    dragRef.current = {
      id,
      offsetX: event.clientX - rect.left - mod.x,
      offsetY: event.clientY - rect.top - mod.y,
      type: 'mod'
    }
    document.body.style.cursor = 'grabbing'
    window.addEventListener('pointermove', handleModPointerMove)
    window.addEventListener('pointerup', stopDragging)
  }

  // Добавление мода на доску
  const addModToBoard = (mod: ModrinthMod, x: number, y: number) => {
    const newMod: BoardMod = {
      id: `${mod.project_id}_${Date.now()}`,
      mod,
      x,
      y
    }
    setMods(prev => [...prev, newMod])
  }

  // Удаление мода (без подтверждения)
  const deleteMod = (id: string) => {
    const mod = mods.find(m => m.id === id)
    if (mod?.categoryId) {
      setCategories(prev => prev.map(cat => 
        cat.id === mod.categoryId 
          ? { ...cat, modIds: cat.modIds.filter(mid => mid !== id) }
          : cat
      ))
    }
    setMods(prev => prev.filter(m => m.id !== id))
  }

  // Создание категории
  const createCategory = (x: number, y: number) => {
    const hue = Math.random() * 360
    const color1 = `hsl(${hue}, 70%, 60%)`
    const color2 = `hsl(${(hue + 30) % 360}, 70%, 55%)`
    
    const newCategory: Category = {
      id: `category_${Date.now()}`,
      title: 'New Category',
      x,
      y,
      color1,
      color2,
      modIds: []
    }
    setCategories(prev => [...prev, newCategory])
  }

  // Удаление категории
  const deleteCategory = (id: string) => {
    const category = categories.find(c => c.id === id)
    if (category) {
      // Возвращаем моды из категории на доску
      setMods(prev => prev.map(mod => 
        mod.categoryId === id 
          ? { ...mod, categoryId: undefined, categoryIndex: undefined }
          : mod
      ))
    }
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  // Перетаскивание из поиска
  useEffect(() => {
    if (!draggingModFromSearch) return

    const handlePointerMove = (e: PointerEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY })
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!boardRef.current) return
      const rect = boardRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - MOD_WIDTH / 2
      const y = e.clientY - rect.top - MOD_HEIGHT / 2
      
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
        addModToBoard(draggingModFromSearch, x, y)
      }
      
      setDraggingModFromSearch(null)
      document.body.style.cursor = ''
    }

    document.body.style.cursor = 'grabbing'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [draggingModFromSearch])

  // Группировка модов по категориям
  const modsByCategory = categories.reduce((acc, cat) => {
    acc[cat.id] = mods.filter(m => m.categoryId === cat.id)
      .sort((a, b) => (a.categoryIndex || 0) - (b.categoryIndex || 0))
    return acc
  }, {} as Record<string, BoardMod[]>)

  const uncategorizedMods = mods.filter(m => !m.categoryId)

  return (
    <div
      ref={boardRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '450px', // Уменьшена высота
        overflow: 'hidden',
        background: '#0b0e15',
        borderRadius: '28px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Grid layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.28) 2px, transparent 2.5px)',
          backgroundSize: `${GRID_SPACING}px ${GRID_SPACING}px`,
          opacity: 0.25
        }}
      />

      {/* Stars layer */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        {stars.map((star, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              background: 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0.35) 60%, transparent 70%)',
              borderRadius: '50%',
              animation: `board-star-twinkle 3s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
        <style>{`
          @keyframes board-star-twinkle {
            0% { transform: scale(0.6); opacity: 0.2; }
            50% { transform: scale(1); opacity: 1; }
            100% { transform: scale(0.6); opacity: 0.2; }
          }
        `}</style>
      </div>

      {/* Search button */}
      <button
        onClick={() => setIsSearchOpen(!isSearchOpen)}
        style={{
          position: 'absolute',
          top: 80,
          left: 20,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: isSearchOpen ? 'rgba(100, 150, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          color: 'rgba(255, 255, 255, 0.8)',
          outline: 'none',
          zIndex: 100,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isSearchOpen ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </>
          )}
        </svg>
      </button>

      {/* Search Panel */}
      {isSearchOpen && (
        <div
          ref={searchPanelRef}
          style={{
            position: 'absolute',
            top: 80,
            left: 78,
            width: 180,
            maxHeight: 240,
            zIndex: 100,
            background: 'rgba(20, 20, 30, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: 11, fontWeight: 600, margin: 0 }}>
              Popular Mods
            </h3>
          </div>
          
          <div 
            className="search-panel-scroll"
            style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: 8,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <style>{`
              .search-panel-scroll::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            {isLoadingMods && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }}>
                Loading...
              </div>
            )}
            
            {!isLoadingMods && searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {searchResults.map((mod) => {
                  const avgColor = getAverageColor(mod.icon_url)
                  const bg = `linear-gradient(135deg, ${avgColor} 0%, rgba(0,0,0,0.4) 100%)`
                  
                  return (
                    <div
                      key={mod.project_id}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        background: bg,
                        cursor: 'grab',
                        userSelect: 'none',
                        transition: 'all 0.2s',
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        setDraggingModFromSearch(mod)
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      <img
                        src={mod.icon_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3Crect width="32" height="32" fill="%23666"/%3E%3C/svg%3E'}
                        alt={mod.title}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          imageRendering: 'pixelated',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          margin: 0,
                        }}>
                          {mod.title}
                        </h3>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drag preview from search */}
      {draggingModFromSearch && (
        <div
          style={{
            position: 'fixed',
            left: dragPosition.x,
            top: dragPosition.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 10000,
            width: MOD_WIDTH,
            opacity: 0.9,
          }}
        >
          <div
            style={{
              width: '100%',
              height: MOD_HEIGHT,
              background: `linear-gradient(135deg, ${getAverageColor(draggingModFromSearch.icon_url)} 0%, rgba(0,0,0,0.4) 100%)`,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 8,
            }}
          >
            <img
              src={draggingModFromSearch.icon_url || ''}
              alt={draggingModFromSearch.title}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                imageRendering: 'pixelated',
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
              }}>
                {draggingModFromSearch.title}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Top toolbar buttons */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {['Check Folder', 'Updates', 'Export', 'Fabric Fix', 'Clear Board'].map((label) => (
          <button
            key={label}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: label === 'Clear Board'
                ? '1px solid rgba(239, 68, 68, 0.5)'
                : '1px solid rgba(255,255,255,0.15)',
              background: label === 'Clear Board'
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(255,255,255,0.06)',
              color: label === 'Clear Board' ? '#ef4444' : '#fff',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              backdropFilter: 'blur(8px)',
            }}
            onClick={() => {
              if (label === 'Clear Board') {
                setMods([])
                setCategories([])
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bottom service buttons */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          zIndex: 1100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        {['Crash Doctor', 'AI Assistant', 'AI Sort'].map((label, idx) => {
          const colors = [
            { border: 'rgba(239, 68, 68, 0.38)', bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.26), rgba(220, 38, 38, 0.3))' },
            { border: 'rgba(168, 85, 247, 0.3)', bg: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(59, 130, 246, 0.2))' },
            { border: 'rgba(34, 197, 94, 0.3)', bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))' },
          ]
          return (
            <button
              key={label}
              style={{
                width: 110,
                padding: '8px 12px',
                borderRadius: 6,
                border: `1px solid ${colors[idx].border}`,
                background: colors[idx].bg,
                backdropFilter: 'blur(12px)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Launch Minecraft button */}
      <div style={{ position: 'absolute', right: 16, bottom: 16, zIndex: 1100 }}>
        <button
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Launch Minecraft
        </button>
      </div>

      {/* Categories */}
      {categories.map((category) => {
        const categoryMods = modsByCategory[category.id] || []
        const categoryHeight = CATEGORY_HEADER_HEIGHT + CATEGORY_PADDING_TOP + 
                              (categoryMods.length * (MOD_HEIGHT + MOD_GAP)) + 
                              CATEGORY_PADDING_BOTTOM
        
        return (
          <div
            key={category.id}
            style={{
              position: 'absolute',
              left: category.x,
              top: category.y,
              width: CATEGORY_WIDTH,
              height: categoryHeight,
              background: `linear-gradient(135deg, ${category.color1}, ${category.color2})`,
              borderRadius: 12,
              border: hoveredCategoryId === category.id ? '2px solid rgba(100, 150, 255, 0.8)' : '2px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 50,
            }}
          >
            <div
              style={{
                height: CATEGORY_HEADER_HEIGHT,
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'move',
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return
                const rect = boardRef.current?.getBoundingClientRect()
                if (!rect) return
                dragRef.current = {
                  id: category.id,
                  offsetX: e.clientX - rect.left - category.x,
                  offsetY: e.clientY - rect.top - category.y,
                  type: 'category'
                }
                document.body.style.cursor = 'grabbing'
                
                const handleMove = (moveEvent: PointerEvent) => {
                  if (!dragRef.current || !boardRef.current) return
                  const rect = boardRef.current.getBoundingClientRect()
                  const x = moveEvent.clientX - rect.left - dragRef.current.offsetX
                  const y = moveEvent.clientY - rect.top - dragRef.current.offsetY
                  setCategories(prev => prev.map(cat => 
                    cat.id === category.id ? { ...cat, x, y } : cat
                  ))
                }
                
                const handleUp = () => {
                  window.removeEventListener('pointermove', handleMove)
                  window.removeEventListener('pointerup', handleUp)
                  dragRef.current = null
                  document.body.style.cursor = ''
                }
                
                window.addEventListener('pointermove', handleMove)
                window.addEventListener('pointerup', handleUp)
              }}
            >
              <input
                type="text"
                value={category.title}
                onChange={(e) => {
                  setCategories(prev => prev.map(cat => 
                    cat.id === category.id ? { ...cat, title: e.target.value } : cat
                  ))
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  outline: 'none',
                  flex: 1,
                }}
                onDoubleClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteCategory(category.id)
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.3)',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  width: 24,
                  height: 24,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: `${CATEGORY_PADDING_TOP}px 0 ${CATEGORY_PADDING_BOTTOM}px 0` }}>
              {categoryMods.map((mod, idx) => (
                <div
                  key={mod.id}
                  style={{
                    marginLeft: 12,
                    marginRight: 12,
                    marginBottom: idx < categoryMods.length - 1 ? MOD_GAP : 0,
                  }}
                >
                  {/* Mod node будет отрендерен здесь, но для упрощения показываем только заголовок */}
                  <div
                    style={{
                      height: MOD_HEIGHT,
                      background: `linear-gradient(135deg, ${getAverageColor(mod.mod.icon_url)} 0%, rgba(0,0,0,0.4) 100%)`,
                      borderRadius: 8,
                      padding: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <img
                      src={mod.mod.icon_url || ''}
                      alt={mod.mod.title}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        imageRendering: 'pixelated',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        margin: 0,
                      }}>
                        {mod.mod.title}
                      </h3>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMod(mod.id)
                      }}
                      style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: 'none',
                        borderRadius: 4,
                        color: '#fff',
                        width: 20,
                        height: 20,
                        cursor: 'pointer',
                        fontSize: 10,
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Uncategorized mods */}
      {uncategorizedMods.map((mod) => {
        const avgColor = getAverageColor(mod.mod.icon_url)
        const bg = `linear-gradient(135deg, ${avgColor} 0%, rgba(0,0,0,0.4) 100%)`

        return (
          <div
            key={mod.id}
            style={{
              position: 'absolute',
              left: mod.x,
              top: mod.y,
              width: MOD_WIDTH,
              height: MOD_HEIGHT,
              cursor: dragRef.current?.id === mod.id ? 'grabbing' : 'grab',
              userSelect: 'none',
              zIndex: dragRef.current?.id === mod.id ? 1000 : 10,
              transform: dragRef.current?.id === mod.id ? 'scale(1.05)' : 'scale(1)',
              transition: dragRef.current?.id === mod.id ? 'none' : 'transform 0.2s ease',
            }}
            onPointerDown={(event) => {
              if (event.button === 0) {
                startDraggingMod(event, mod.id)
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              deleteMod(mod.id)
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: bg,
                borderRadius: 12,
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 8,
                  width: '100%',
                  height: MOD_HEIGHT,
                  boxSizing: 'border-box',
                }}
              >
                <img
                  src={mod.mod.icon_url || ''}
                  alt={mod.mod.title}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    flexShrink: 0,
                    imageRendering: 'pixelated',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <h3
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#fff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    {mod.mod.title}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Create category on right-click */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          if (!boardRef.current) return
          const rect = boardRef.current.getBoundingClientRect()
          const x = e.clientX - rect.left - CATEGORY_WIDTH / 2
          const y = e.clientY - rect.top - CATEGORY_HEADER_HEIGHT / 2
          createCategory(x, y)
        }}
      />
    </div>
  )
}
