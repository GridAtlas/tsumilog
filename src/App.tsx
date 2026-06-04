import { useMemo, useRef, useState } from 'react'
import {
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Clapperboard,
  Gamepad2,
  Home,
  Library,
  Plus,
  Search,
  Settings,
  Sparkles,
  Download,
  History,
  Trash2,
  Tv,
  Upload,
  X,
} from 'lucide-react'

type ItemType = 'book' | 'game' | 'anime' | 'drama'
type ItemStatus = 'unstarted' | 'active' | 'completed'
type Tab = 'home' | 'library' | 'alerts'

type ProgressLog = {
  id: number
  date: string
  amount: number
  currentAmount: number
}

type Item = {
  id: number
  title: string
  subtitle: string
  type: ItemType
  status: ItemStatus
  totalAmount: number
  currentAmount: number
  purchasedAt: string
  lastActiveAt?: string
  alertAfterDays?: number
  cover: string
  history: ProgressLog[]
}

type StoredItem = Partial<Item> & Pick<Item, 'id' | 'title' | 'subtitle' | 'type' | 'purchasedAt' | 'cover'> & {
  progress?: number
}

const DAY = 1000 * 60 * 60 * 24
const staleAfterDays = 14
const storageKey = 'tsumilog-items'
const exportVersion = 1

const initialItems: Item[] = [
  {
    id: 1,
    title: 'プロジェクト・ヘイル・メアリー',
    subtitle: 'アンディ・ウィアー',
    type: 'book',
    status: 'active',
    totalAmount: 576,
    currentAmount: 242,
    purchasedAt: '2026-04-18',
    lastActiveAt: '2026-05-27',
    cover: 'cover-orange',
    history: [
      { id: 101, date: '2026-05-27', amount: 38, currentAmount: 242 },
      { id: 102, date: '2026-05-20', amount: 64, currentAmount: 204 },
      { id: 103, date: '2026-05-12', amount: 140, currentAmount: 140 },
    ],
  },
  {
    id: 2,
    title: '星の旅人',
    subtitle: 'Nintendo Switch',
    type: 'game',
    status: 'unstarted',
    totalAmount: 15,
    currentAmount: 0,
    purchasedAt: '2026-05-10',
    cover: 'cover-blue',
    history: [],
  },
  {
    id: 3,
    title: '思考の整理学',
    subtitle: '外山 滋比古',
    type: 'book',
    status: 'active',
    totalAmount: 240,
    currentAmount: 163,
    purchasedAt: '2026-04-02',
    lastActiveAt: '2026-06-02',
    cover: 'cover-green',
    history: [
      { id: 301, date: '2026-06-02', amount: 35, currentAmount: 163 },
      { id: 302, date: '2026-05-29', amount: 48, currentAmount: 128 },
      { id: 303, date: '2026-05-21', amount: 80, currentAmount: 80 },
    ],
  },
  {
    id: 4,
    title: 'Coffee Talk',
    subtitle: 'Steam',
    type: 'game',
    status: 'completed',
    totalAmount: 5,
    currentAmount: 5,
    purchasedAt: '2026-03-22',
    lastActiveAt: '2026-05-28',
    cover: 'cover-purple',
    history: [
      { id: 401, date: '2026-05-28', amount: 1.5, currentAmount: 5 },
      { id: 402, date: '2026-05-25', amount: 2, currentAmount: 3.5 },
      { id: 403, date: '2026-05-23', amount: 1.5, currentAmount: 1.5 },
    ],
  },
]

function normalizeItems(items: StoredItem[]) {
  return items.map((item) => {
    const defaultTotal = item.type === 'book' ? 300 : item.type === 'game' ? 20 : 12
    const totalAmount = item.totalAmount ?? defaultTotal
    const currentAmount = item.currentAmount ?? Math.round(totalAmount * ((item.progress ?? 0) / 100))
    return {
      ...item,
      status: currentAmount >= totalAmount ? 'completed' : currentAmount > 0 ? 'active' : 'unstarted',
      totalAmount,
      currentAmount,
      history: item.history ?? [],
    } as Item
  })
}

function loadItems() {
  const saved = localStorage.getItem(storageKey)
  if (!saved) return initialItems

  try {
    return normalizeItems(JSON.parse(saved) as StoredItem[])
  } catch {
    return initialItems
  }
}

function isValidStoredItem(item: unknown): item is StoredItem {
  if (!item || typeof item !== 'object') return false
  const candidate = item as Partial<StoredItem>
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.title === 'string' &&
    typeof candidate.subtitle === 'string' &&
    ['book', 'game', 'anime', 'drama'].includes(candidate.type ?? '') &&
    typeof candidate.purchasedAt === 'string' &&
    typeof candidate.cover === 'string'
  )
}

function parseImportedItems(data: unknown) {
  const payload = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)
      ? (data as { items: unknown[] }).items
      : null

  if (!payload || !payload.every(isValidStoredItem)) {
    throw new Error('invalid backup')
  }

  return normalizeItems(payload)
}

function dateDiff(date?: string) {
  if (!date) return 0
  const from = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - from.getTime()) / DAY))
}

function getProgress(item: Item) {
  return Math.min(100, Math.round((item.currentAmount / item.totalAmount) * 100))
}

function formatAmount(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1)
}

function formatRelativeDate(date?: string) {
  if (!date) return 'まだ更新はありません'
  const days = dateDiff(date)
  if (days === 0) return '今日更新'
  if (days === 1) return '昨日更新'
  return `${days}日前に更新`
}

function formatJapaneseDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  return `${parsed.getMonth() + 1}月${parsed.getDate()}日`
}

function isEpisodeType(type: ItemType) {
  return type === 'anime' || type === 'drama'
}

function getTypeMeta(type: ItemType) {
  if (type === 'book') return 'BOOK'
  if (type === 'game') return 'GAME'
  if (type === 'anime') return 'ANIME'
  return 'DRAMA'
}

function getUnit(type: ItemType) {
  if (type === 'book') return 'ページ'
  if (type === 'game') return '時間'
  return '話'
}

function TypeIcon({ type, size }: { type: ItemType; size: number }) {
  if (type === 'book') return <BookOpen size={size} />
  if (type === 'game') return <Gamepad2 size={size} />
  if (type === 'anime') return <Clapperboard size={size} />
  return <Tv size={size} />
}

function App() {
  const [items, setItems] = useState<Item[]>(loadItems)
  const [tab, setTab] = useState<Tab>('home')
  const [filter, setFilter] = useState<'all' | ItemType>('all')
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [progressItem, setProgressItem] = useState<Item | null>(null)
  const [detailItemId, setDetailItemId] = useState<number | null>(null)

  const alerts = useMemo(
    () =>
      items.filter((item) => {
        if (item.status === 'completed') return false
        if (item.status === 'unstarted') return true
        return dateDiff(item.lastActiveAt) >= staleAfterDays
      }),
    [items],
  )

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesFilter = filter === 'all' || item.type === filter
        const matchesQuery = `${item.title} ${item.subtitle}`.toLowerCase().includes(query.toLowerCase())
        const matchesTab = tab !== 'alerts' || alerts.some((alert) => alert.id === item.id)
        return matchesFilter && matchesQuery && matchesTab
      }),
    [alerts, filter, items, query, tab],
  )

  const persist = (next: Item[]) => {
    setItems(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  const updateProgress = (id: number, amount: number) => {
    const today = new Date().toISOString().slice(0, 10)
    persist(
      items.map((item) => {
        if (item.id !== id) return item
        const nextAmount = Math.min(amount, item.totalAmount)
        const change = nextAmount - item.currentAmount
        return {
          ...item,
          currentAmount: nextAmount,
          status: nextAmount >= item.totalAmount ? 'completed' : nextAmount > 0 ? 'active' : 'unstarted',
          lastActiveAt: today,
          history: change === 0
            ? item.history
            : [{ id: Date.now(), date: today, amount: change, currentAmount: nextAmount }, ...item.history],
        }
      }),
    )
    setProgressItem(null)
  }

  const addItem = (item: Omit<Item, 'id' | 'status' | 'currentAmount' | 'cover' | 'history'>) => {
    const colors = ['cover-orange', 'cover-blue', 'cover-green', 'cover-purple']
    persist([
      {
        ...item,
        id: Date.now(),
        status: 'unstarted',
        currentAmount: 0,
        cover: colors[items.length % colors.length],
        history: [],
      },
      ...items,
    ])
    setShowAdd(false)
  }

  const deleteItem = (id: number) => {
    persist(items.filter((item) => item.id !== id))
    setDetailItemId(null)
  }

  const importItems = (next: Item[]) => {
    persist(next)
    setShowSettings(false)
  }

  const activeCount = items.filter((item) => item.status === 'active').length
  const completedCount = items.filter((item) => item.status === 'completed').length
  const detailItem = items.find((item) => item.id === detailItemId) ?? null

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">MY BACKLOG</p>
          <h1>積みログ</h1>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" aria-label="通知" onClick={() => setTab('alerts')}>
            <Bell size={20} />
            {alerts.length > 0 && <span className="notification-dot" />}
          </button>
          <button className="icon-button" aria-label="設定" onClick={() => setShowSettings(true)}>
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main>
        {tab === 'home' && (
          <>
            <section className="hero-card">
              <div className="hero-copy">
                <span className="hero-icon"><Sparkles size={17} /></span>
                <p>今日のひと押し</p>
                <h2>{alerts[0]?.title ?? '積みはありません'}</h2>
                <span>{alerts[0] ? '少しだけでも進めませんか？' : 'この調子で楽しみましょう'}</span>
              </div>
              <HeroBookStack items={items} />
              {alerts[0] && (
                <button className="hero-action" onClick={() => setProgressItem(alerts[0])}>
                  進捗を記録 <ChevronRight size={16} />
                </button>
              )}
            </section>

            <section className="stats-grid" aria-label="サマリー">
              <div><strong>{items.length}</strong><span>登録済み</span></div>
              <div><strong>{activeCount}</strong><span>進行中</span></div>
              <div><strong>{completedCount}</strong><span>完了</span></div>
            </section>
          </>
        )}

        <section className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{tab === 'alerts' ? 'NEEDS ATTENTION' : 'YOUR COLLECTION'}</p>
              <h2>{tab === 'alerts' ? '気になる積み' : tab === 'library' ? 'ライブラリ' : '最近の積み'}</h2>
            </div>
            {tab === 'home' && <button className="text-button" onClick={() => setTab('library')}>すべて見る</button>}
          </div>

          {(tab === 'library' || tab === 'alerts') && (
            <div className="search-box">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="タイトルや著者で検索" />
            </div>
          )}

          <div className="filter-row">
            {(['all', 'book', 'game', 'anime', 'drama'] as const).map((value) => (
              <button key={value} className={filter === value ? 'filter active' : 'filter'} onClick={() => setFilter(value)}>
                {value === 'all' ? 'すべて' : value === 'book' ? '読書' : value === 'game' ? 'ゲーム' : value === 'anime' ? 'アニメ' : 'ドラマ'}
              </button>
            ))}
          </div>

          <div className="item-list">
            {visibleItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onOpen={() => setDetailItemId(item.id)}
                onProgress={() => setProgressItem(item)}
              />
            ))}
            {visibleItems.length === 0 && (
              <div className="empty-state">
                <Check size={26} />
                <strong>対象の積みはありません</strong>
                <span>新しく買った作品を登録しておきましょう。</span>
              </div>
            )}
          </div>
        </section>
      </main>

      <button className="fab" aria-label="新しく登録" onClick={() => setShowAdd(true)}><Plus size={24} /></button>

      <nav className="bottom-nav">
        <NavButton active={tab === 'home'} label="ホーム" icon={<Home size={20} />} onClick={() => setTab('home')} />
        <NavButton active={tab === 'library'} label="ライブラリ" icon={<Library size={20} />} onClick={() => setTab('library')} />
        <NavButton active={tab === 'alerts'} label="アラート" icon={<Bell size={20} />} badge={alerts.length} onClick={() => setTab('alerts')} />
      </nav>

      {showAdd && <AddSheet onClose={() => setShowAdd(false)} onAdd={addItem} />}
      {showSettings && <SettingsSheet items={items} onClose={() => setShowSettings(false)} onImport={importItems} />}
      {detailItem && (
        <HistorySheet
          item={detailItem}
          onClose={() => setDetailItemId(null)}
          onProgress={() => {
            setDetailItemId(null)
            setProgressItem(detailItem)
          }}
          onDelete={() => deleteItem(detailItem.id)}
        />
      )}
      {progressItem && <ProgressSheet item={progressItem} onClose={() => setProgressItem(null)} onSave={updateProgress} />}
    </div>
  )
}

function HeroBookStack({ items }: { items: Item[] }) {
  const stackItems = items.length
    ? items.filter((item) => item.status !== 'completed').concat(items.filter((item) => item.status === 'completed')).slice(0, 7)
    : [
      { id: 1, cover: 'cover-orange' },
      { id: 2, cover: 'cover-blue' },
      { id: 3, cover: 'cover-green' },
      { id: 4, cover: 'cover-purple' },
    ]

  return (
    <div className="book-stack" aria-hidden="true">
      {stackItems.map((item, index) => (
        <span
          key={item.id}
          className={`stack-book ${item.cover}`}
          style={{
            width: `${70 + (index % 3) * 12}px`,
            transform: `translateX(${index % 2 === 0 ? 0 : 7}px) rotate(${index % 2 === 0 ? '-1.5deg' : '1.5deg'})`,
          }}
        >
          <i />
        </span>
      ))}
    </div>
  )
}

function SettingsSheet({ items, onClose, onImport }: { items: Item[]; onClose: () => void; onImport: (items: Item[]) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  const exportItems = () => {
    const backup = {
      app: 'tsumilog',
      version: exportVersion,
      exportedAt: new Date().toISOString(),
      items,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `tsumilog-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('保存用ファイルを作成しました')
  }

  const importFromFile = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      const nextItems = parseImportedItems(data)
      if (!window.confirm('現在の積みログを読み込んだデータで置き換えますか？')) return
      onImport(nextItems)
    } catch {
      setMessage('読み込めないファイルです')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section className="sheet settings-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div><p className="eyebrow">SETTINGS</p><h2>設定</h2></div>
          <button type="button" className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="settings-actions">
          <button type="button" onClick={exportItems}>
            <Download size={18} />
            <span><strong>保存</strong><small>積みログをJSONファイルで書き出します</small></span>
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} />
            <span><strong>読み込み</strong><small>保存したJSONファイルから復元します</small></span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importFromFile(file)
          }}
        />
        {message && <p className="settings-message">{message}</p>}
      </section>
    </div>
  )
}

function ItemCard({ item, onOpen, onProgress }: { item: Item; onOpen: () => void; onProgress: () => void }) {
  const inactiveDays = dateDiff(item.lastActiveAt)
  const warning = item.status === 'active' && inactiveDays >= staleAfterDays
  const progress = getProgress(item)
  const unit = getUnit(item.type)

  return (
    <article className="item-card" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => {
      if (event.currentTarget === event.target && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        onOpen()
      }
    }}>
      <div className={`cover ${item.cover}`}>
        <TypeIcon type={item.type} size={25} />
      </div>
      <div className="item-body">
        <div className="item-meta">
          <span>{getTypeMeta(item.type)}</span>
          <span className="updated-at">{formatRelativeDate(item.lastActiveAt)}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.subtitle}</p>
        {warning && <span className="warning">{inactiveDays}日空いています</span>}
        <div className="progress-heading">
          <span>{item.status === 'unstarted' ? '未開始' : item.status === 'completed' ? '完了' : '進捗'}</span>
          <strong>{formatAmount(item.currentAmount)} / {formatAmount(item.totalAmount)}{unit} · {progress}%</strong>
        </div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        {item.status !== 'completed' && (
          <div className="quick-actions">
            <button onClick={(event) => { event.stopPropagation(); onProgress() }}>
              {item.type === 'book' ? '読んだページを記録' : item.type === 'game' ? 'プレー時間を記録' : '見た話数を記録'}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

function HistorySheet({ item, onClose, onProgress, onDelete }: { item: Item; onClose: () => void; onProgress: () => void; onDelete: () => void }) {
  const isBook = item.type === 'book'
  const isGame = item.type === 'game'
  const unit = getUnit(item.type)

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section className="sheet history-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div><p className="eyebrow">PROGRESS HISTORY</p><h2>これまでの履歴</h2></div>
          <button type="button" className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="progress-target">
          <span><TypeIcon type={item.type} size={18} /></span>
          <div>
            <strong>{item.title}</strong>
            <small>{formatRelativeDate(item.lastActiveAt)} · 現在 {formatAmount(item.currentAmount)} / {formatAmount(item.totalAmount)}{unit}</small>
          </div>
        </div>
        {item.history.length > 0 ? (
          <ol className="history-list">
            {item.history.map((log) => (
              <li key={log.id}>
                <span className="history-icon"><History size={15} /></span>
                <div>
                  <time dateTime={log.date}>{formatJapaneseDate(log.date)}</time>
                  <strong>
                    {log.amount >= 0
                      ? `${formatAmount(log.amount)}${unit}${isBook ? '読み進めた' : isGame ? 'プレーした' : '見た'}`
                      : `${formatAmount(Math.abs(log.amount))}${unit}分、進捗を修正した`}
                  </strong>
                </div>
                <small>{formatAmount(log.currentAmount)}{unit}</small>
              </li>
            ))}
          </ol>
        ) : (
          <div className="history-empty">
            <History size={22} />
            <strong>まだ履歴はありません</strong>
            <span>進捗を記録すると、ここに積み重なります。</span>
          </div>
        )}
        {item.status !== 'completed' && <button className="primary-button" type="button" onClick={onProgress}>進捗を記録する</button>}
        <button
          className="delete-button"
          type="button"
          onClick={() => {
            if (window.confirm(`「${item.title}」を積みログから削除しますか？`)) onDelete()
          }}
        >
          <Trash2 size={15} /> この項目を削除する
        </button>
      </section>
    </div>
  )
}

function NavButton({ active, label, icon, badge, onClick }: { active: boolean; label: string; icon: React.ReactNode; badge?: number; onClick: () => void }) {
  return (
    <button className={active ? 'nav-button active' : 'nav-button'} onClick={onClick}>
      <span className="nav-icon">{icon}{badge ? <i>{badge}</i> : null}</span>
      {label}
    </button>
  )
}

function AddSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (item: Omit<Item, 'id' | 'status' | 'currentAmount' | 'cover' | 'history'>) => void }) {
  const [type, setType] = useState<ItemType>('book')
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().slice(0, 10))

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <form
        className="sheet add-sheet"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          const parsedTotal = Number(totalAmount)
          if (!title.trim() || parsedTotal <= 0) return
          onAdd({ title: title.trim(), subtitle: subtitle.trim(), type, totalAmount: parsedTotal, purchasedAt })
        }}
      >
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div><p className="eyebrow">ADD TO BACKLOG</p><h2>新しく登録</h2></div>
          <button type="button" className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="type-toggle">
          <button type="button" className={type === 'book' ? 'active' : ''} onClick={() => { setType('book'); setTotalAmount('') }}><BookOpen size={18} /> 読書</button>
          <button type="button" className={type === 'game' ? 'active' : ''} onClick={() => { setType('game'); setTotalAmount('') }}><Gamepad2 size={18} /> ゲーム</button>
          <button type="button" className={type === 'anime' ? 'active' : ''} onClick={() => { setType('anime'); setTotalAmount('') }}><Clapperboard size={18} /> アニメ</button>
          <button type="button" className={type === 'drama' ? 'active' : ''} onClick={() => { setType('drama'); setTotalAmount('') }}><Tv size={18} /> ドラマ</button>
        </div>
        <label>タイトル<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="作品名を入力" /></label>
        <label>{type === 'book' ? '著者' : type === 'game' ? 'プラットフォーム' : '配信サービスなど'}<input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder={type === 'book' ? '著者名' : type === 'game' ? 'Steam / Switch など' : 'Netflix / TV など'} /></label>
        <label>{type === 'book' ? 'ページ数' : type === 'game' ? '想定クリア時間' : '全話数'}
          <input
            type="number"
            min="0"
            step={type === 'game' ? '0.5' : '1'}
            value={totalAmount}
            onChange={(event) => setTotalAmount(event.target.value)}
            placeholder={type === 'book' ? '例: 320' : type === 'game' ? '例: 20' : '例: 12'}
            required
          />
          <span className="field-hint">{type === 'book' ? '本の総ページ数を入力してください' : type === 'game' ? 'クリアまでにかかりそうな時間を入力してください' : '作品の全話数を入力してください'}</span>
        </label>
        <label>購入日<input type="date" value={purchasedAt} onChange={(event) => setPurchasedAt(event.target.value)} /></label>
        <button className="primary-button" type="submit">積みログに追加する</button>
      </form>
    </div>
  )
}

function ProgressSheet({ item, onClose, onSave }: { item: Item; onClose: () => void; onSave: (id: number, amount: number) => void }) {
  const [value, setValue] = useState('')
  const isBook = item.type === 'book'
  const isGame = item.type === 'game'
  const isCumulative = isBook || isEpisodeType(item.type)
  const unit = getUnit(item.type)

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <form
        className="sheet progress-sheet"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          const parsedValue = Number(value)
          if (parsedValue < 0 || !value) return
          onSave(item.id, isCumulative ? parsedValue : item.currentAmount + parsedValue)
        }}
      >
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div><p className="eyebrow">LOG PROGRESS</p><h2>進捗を記録</h2></div>
          <button type="button" className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="progress-target">
          <span><TypeIcon type={item.type} size={18} /></span>
          <div><strong>{item.title}</strong><small>現在 {formatAmount(item.currentAmount)} / {formatAmount(item.totalAmount)}{unit}</small></div>
        </div>
        <label>{isBook ? '何ページまで読みましたか？' : isGame ? '今日、何時間プレーしましたか？' : '何話まで見ましたか？'}
          <input
            type="number"
            min="0"
            max={isCumulative ? item.totalAmount : undefined}
            step={isGame ? '0.5' : '1'}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={isBook ? `例: ${Math.min(item.currentAmount + 20, item.totalAmount)}` : isGame ? '例: 1.5' : `例: ${Math.min(item.currentAmount + 1, item.totalAmount)}`}
            autoFocus
            required
          />
          <span className="field-hint">{isBook ? `全${formatAmount(item.totalAmount)}ページ` : isGame ? `想定クリア時間 ${formatAmount(item.totalAmount)}時間` : `全${formatAmount(item.totalAmount)}話`}</span>
        </label>
        <button className="primary-button" type="submit">記録する</button>
      </form>
    </div>
  )
}

export default App
