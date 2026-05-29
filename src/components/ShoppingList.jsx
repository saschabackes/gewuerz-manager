import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import useStore from '../store/useStore'
import { exportShoppingListAsPDF, shareShoppingList, exportShoppingListAsText, downloadTextFile } from '../utils/export'
import { COMMON_SPICES } from '../data/spices'

const BRING_POLL_MS = 30_000 // alle 30 Sekunden

export default function ShoppingList() {
  const { shoppingItems: items, addShoppingItem, toggleShoppingItem,
          deleteShoppingItem, clearCheckedShopping, updateShoppingItem } = useStore()
  const bringSettings    = useStore(s => s.bringSettings)
  const bringItems       = useStore(s => s.bringItems)
  const bringItemsError  = useStore(s => s.bringItemsError)
  const loadBringItems   = useStore(s => s.loadBringItems)
  const removeBringItem  = useStore(s => s.removeBringItem)
  const currentUser      = useStore(s => s.currentUser())

  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newIsSpice, setNewIsSpice] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSugg, setShowSugg] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [showExport, setShowExport] = useState(false)
  const suggTimeout = useRef(null)

  const [bringRefreshing, setBringRefreshing] = useState(false)

  const checkedCount = useMemo(() => items.filter(i => i.checked).length, [items])
  const userName = currentUser?.name ?? 'Benutzer'

  const bringActive = !!(bringSettings?.listUuid && bringSettings?.accessToken)

  // Bring!-Artikel laden + alle 30 s pollen
  const refresh = useCallback(async () => {
    setBringRefreshing(true)
    await loadBringItems()
    setBringRefreshing(false)
  }, [loadBringItems])

  useEffect(() => {
    if (!bringActive) return
    refresh()
    const id = setInterval(loadBringItems, BRING_POLL_MS)
    return () => clearInterval(id)
  }, [bringActive]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleNameInput(e) {
    const val = e.target.value
    setNewName(val)
    setNewIsSpice(false) // manuelles Tippen → kein Gewürz-Flag
    if (val.trim().length >= 1) {
      const q = val.toLowerCase()
      setSuggestions(COMMON_SPICES.filter(s => s.toLowerCase().includes(q)).slice(0, 5))
      setShowSugg(true)
    } else {
      setShowSugg(false)
    }
  }

  function addItem(e) {
    e.preventDefault()
    if (!newName.trim()) return
    addShoppingItem(newName, newAmount, newIsSpice)
    setNewName('')
    setNewAmount('')
    setNewIsSpice(false)
    setShowSugg(false)
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditAmount(item.amount)
  }

  function saveEdit(id) {
    if (editName.trim()) updateShoppingItem(id, { name: editName.trim(), amount: editAmount.trim() })
    setEditingId(null)
  }

  function handleExportText() {
    const text = exportShoppingListAsText(items, userName)
    downloadTextFile(text, 'einkaufsliste.txt')
    setShowExport(false)
  }

  function handleExportPDF() {
    exportShoppingListAsPDF(items, userName)
    setShowExport(false)
  }

  function handleShare() {
    shareShoppingList(items, userName)
    setShowExport(false)
  }

  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)

  return (
    <div className="flex flex-col h-full">

      {/* Bring!-Banner */}
      {bringActive && (
        <div className="bg-orange-50 border-b border-orange-100 px-4 py-2.5 flex items-center gap-3">
          <span className="text-lg leading-none">🛍</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-orange-800">Bring! aktiv – Liste: {bringSettings.listName}</p>
            <p className="text-xs text-orange-600">Artikel gehen direkt in deine Bring!-Liste.</p>
          </div>
          <a
            href="https://web.getbring.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-none text-xs font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-xl px-3 py-1.5 transition-colors"
          >
            Öffnen
          </a>
        </div>
      )}

      {/* Add item form */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <form onSubmit={addItem} className="space-y-2">
          <div className="relative">
            <input
              type="text"
              className="input"
              placeholder="Gewürz hinzufügen…"
              value={newName}
              onChange={handleNameInput}
              onBlur={() => { suggTimeout.current = setTimeout(() => setShowSugg(false), 150) }}
              autoComplete="off"
            />
            {showSugg && suggestions.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 mt-1"
                onMouseDown={() => clearTimeout(suggTimeout.current)}
              >
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    onClick={() => { setNewName(s); setNewIsSpice(true); setShowSugg(false) }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="Menge (optional, z.B. 2×)"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
            />
            <button type="submit" className="btn-primary flex-none px-5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Toolbar – Bring!-Modus */}
      {bringActive && (
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {bringItems.length} Artikel auf der Liste
          </span>
          <button
            onClick={refresh}
            disabled={bringRefreshing}
            className="text-xs text-orange-600 font-semibold px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-1 disabled:opacity-40"
          >
            <svg className={`w-4 h-4 ${bringRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Aktualisieren
          </button>
        </div>
      )}

      {/* Toolbar – eingebaute Liste */}
      {!bringActive && items.length > 0 && (
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {items.length} Artikel{checkedCount > 0 ? `, ${checkedCount} erledigt` : ''}
          </span>
          <div className="flex gap-2 items-center">
            {checkedCount > 0 && (
              <button
                onClick={() => { if (confirm(`${checkedCount} erledigte Artikel löschen?`)) clearCheckedShopping() }}
                className="text-xs text-red-500 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                Erledigt löschen
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowExport(v => !v)}
                className="text-xs text-green-600 font-semibold px-2 py-1 rounded-lg hover:bg-green-50 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export
              </button>
              {showExport && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 min-w-[170px]">
                    <button onClick={handleShare} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Teilen / Text-Export
                    </button>
                    <button onClick={handleExportText} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Als .txt herunterladen
                    </button>
                    <button onClick={handleExportPDF} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Als PDF herunterladen
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List – Bring!-Modus */}
      {bringActive && (() => {
        const spiceItems = bringItems.filter(i => i.specification === 'Gewürz')
        const otherItems = bringItems.filter(i => i.specification !== 'Gewürz')
        const showSections = spiceItems.length > 0 && otherItems.length > 0
        return (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {bringItemsError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <p className="font-semibold mb-0.5">Bring!-Liste konnte nicht geladen werden</p>
                <p className="text-xs text-red-500 font-mono break-all">{bringItemsError}</p>
              </div>
            )}
            {!bringItemsError && bringItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">🛍</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Bring!-Liste ist leer</h3>
                <p className="text-sm text-gray-400">Füge Artikel hinzu – sie erscheinen hier und in deiner Bring!-App</p>
              </div>
            )}

            {/* Gewürze-Sektion */}
            {spiceItems.length > 0 && (
              <>
                {showSections && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">🧂 Gewürze</span>
                    <div className="flex-1 h-px bg-green-100" />
                  </div>
                )}
                {spiceItems.map(item => (
                  <BringListItem key={item.uuid || item.name} item={item} isSpice
                    onRemove={() => removeBringItem(item.name)} />
                ))}
              </>
            )}

            {/* Sonstige Artikel */}
            {otherItems.length > 0 && (
              <>
                {showSections && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🛒 Einkauf</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
                {otherItems.map(item => (
                  <BringListItem key={item.uuid || item.name} item={item}
                    onRemove={() => removeBringItem(item.name)} />
                ))}
              </>
            )}

            <div className="h-2" />
          </div>
        )
      })()}

      {/* List – eingebaute Liste */}
      {!bringActive && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">🛒</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">Einkaufsliste ist leer</h3>
              <p className="text-sm text-gray-400">Füge Artikel hinzu, die du kaufen möchtest</p>
            </div>
          ) : (
            <>
              {unchecked.map(item => (
                <ShoppingItem
                  key={item.id}
                  item={item}
                  isEditing={editingId === item.id}
                  editName={editName}
                  editAmount={editAmount}
                  onEditNameChange={setEditName}
                  onEditAmountChange={setEditAmount}
                  onToggle={() => toggleShoppingItem(item.id)}
                  onEdit={() => startEdit(item)}
                  onSaveEdit={() => saveEdit(item.id)}
                  onDelete={() => deleteShoppingItem(item.id)}
                />
              ))}

              {checked.length > 0 && (
                <>
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">Erledigt ({checked.length})</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  {checked.map(item => (
                    <ShoppingItem
                      key={item.id}
                      item={item}
                      isEditing={false}
                      editName=""
                      editAmount=""
                      onEditNameChange={() => {}}
                      onEditAmountChange={() => {}}
                      onToggle={() => toggleShoppingItem(item.id)}
                      onEdit={() => {}}
                      onSaveEdit={() => {}}
                      onDelete={() => deleteShoppingItem(item.id)}
                    />
                  ))}
                </>
              )}
              <div className="h-2" />
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Bring!-Artikel-Karte ──────────────────────────────────────────────────────

function BringListItem({ item, onRemove, isSpice = false }) {
  return (
    <div className={`card flex items-center gap-3 px-4 py-3 ${isSpice ? 'border-l-2 border-green-400' : ''}`}>
      {/* Checkmark-Button → entfernt aus Bring!-Liste (= "gekauft") */}
      <button
        onClick={onRemove}
        className="flex-none w-6 h-6 rounded-full border-2 border-gray-300 hover:border-orange-400 flex items-center justify-center transition-all"
        title="Als gekauft markieren"
      >
        <svg className="w-3 h-3 text-gray-300 hover:text-orange-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <span className="font-medium text-gray-900">{item.name}</span>
        {item.specification && (
          <span className="text-sm text-gray-400 ml-2">{item.specification}</span>
        )}
      </div>

      <button
        onClick={onRemove}
        className="flex-none p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
        title="Entfernen"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

// ── Eingebaute Einkaufsliste ──────────────────────────────────────────────────

function ShoppingItem({ item, isEditing, editName, editAmount, onEditNameChange, onEditAmountChange, onToggle, onEdit, onSaveEdit, onDelete }) {
  if (isEditing) {
    return (
      <div className="card p-3 space-y-2 ring-2 ring-green-500">
        <input
          type="text"
          className="input py-2"
          value={editName}
          onChange={e => onEditNameChange(e.target.value)}
          autoFocus
        />
        <input
          type="text"
          className="input py-2"
          value={editAmount}
          placeholder="Menge"
          onChange={e => onEditAmountChange(e.target.value)}
        />
        <button onClick={onSaveEdit} className="btn-primary w-full py-2 text-sm">
          Speichern
        </button>
      </div>
    )
  }

  return (
    <div className={`card flex items-center gap-3 px-4 py-3 transition-opacity ${item.checked ? 'opacity-50' : ''}`}>
      <button
        onClick={onToggle}
        className={`flex-none w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          item.checked ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 hover:border-green-400'
        }`}
      >
        {item.checked && (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <span className={`font-medium text-gray-900 ${item.checked ? 'line-through' : ''}`}>{item.name}</span>
        {item.amount && (
          <span className="text-sm text-gray-400 ml-2">{item.amount}</span>
        )}
      </div>

      <div className="flex-none flex items-center gap-1">
        {!item.checked && (
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
