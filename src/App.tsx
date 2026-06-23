import { useMemo, useRef, useState } from 'react'
import {
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Clapperboard,
  CircleCheck,
  Gamepad2,
  Home,
  Library,
  Plus,
  Search,
  Settings,
  Sparkles,
  Download,
  Film,
  History,
  Trash2,
  Tv,
  Upload,
  X,
} from 'lucide-react'

type ItemType = 'book' | 'game' | 'anime' | 'drama' | 'movie' | 'action'
type ItemStatus = 'unstarted' | 'active' | 'completed'
type Tab = 'home' | 'library' | 'alerts'
type LibrarySection = 'plan' | 'active' | 'completed'

type ProgressLog = {
  id: number
  date: string
  amount: number
  currentAmount: number
  totalAmount?: number
  comment?: string
  rating?: number
  kind?: 'progress' | 'extension' | 'completion' | 'registration'
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
  rating?: number
  completedAt?: string
  cover: string
  history: ProgressLog[]
}

type PlanItem = {
  id: number
  title: string
  subtitle: string
  type: ItemType
  plannedAt?: string
  createdAt: string
  cover: string
}

type StoredItem = Partial<Item> & Pick<Item, 'id' | 'title' | 'subtitle' | 'type' | 'purchasedAt' | 'cover'> & {
  progress?: number
}

const coverOptions = [
  'cover-orange',
  'cover-blue',
  'cover-green',
  'cover-purple',
  'cover-red',
  'cover-yellow',
  'cover-teal',
  'cover-gray',
]
const DAY = 1000 * 60 * 60 * 24
const staleAfterDays = 14
const planAlertWindowDays = 7
const storageKey = 'tsumilog-items'
const planStorageKey = 'tsumilog-plan-items'
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

function getDefaultTotal(type: ItemType) {
  if (type === 'book') return 300
  if (type === 'game') return 20
  if (isSingleActionType(type)) return 1
  return 12
}

function registrationLog(item: Pick<Item, 'id' | 'purchasedAt'>): ProgressLog {
  return {
    id: item.id * 1000,
    date: item.purchasedAt,
    amount: 0,
    currentAmount: 0,
    kind: 'registration',
  }
}

function normalizeItems(items: StoredItem[]) {
  return items.map((item) => {
    const defaultTotal = getDefaultTotal(item.type)
    const totalAmount = item.totalAmount && item.totalAmount > 0 ? item.totalAmount : defaultTotal
    const currentAmount = item.currentAmount ?? Math.round(totalAmount * ((item.progress ?? 0) / 100))
    const history = item.history ?? []
    return {
      ...item,
      status: currentAmount >= totalAmount ? 'completed' : currentAmount > 0 ? 'active' : 'unstarted',
      totalAmount,
      currentAmount,
      history: history.some((log) => log.kind === 'registration') ? history : [...history, registrationLog(item)],
    } as Item
  })
}

function loadPlanItems() {
  const saved = localStorage.getItem(planStorageKey)
  if (!saved) return []

  try {
    const parsed = JSON.parse(saved) as PlanItem[]
    return parsed.filter(isValidPlanItem)
  } catch {
    return []
  }
}

function loadItems() {
  const saved = localStorage.getItem(storageKey)
  if (!saved) return normalizeItems(initialItems)

  try {
    return normalizeItems(JSON.parse(saved) as StoredItem[])
  } catch {
    return normalizeItems(initialItems)
  }
}

function isValidStoredItem(item: unknown): item is StoredItem {
  if (!item || typeof item !== 'object') return false
  const candidate = item as Partial<StoredItem>
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.title === 'string' &&
    typeof candidate.subtitle === 'string' &&
    ['book', 'game', 'anime', 'drama', 'movie', 'action'].includes(candidate.type ?? '') &&
    typeof candidate.purchasedAt === 'string' &&
    typeof candidate.cover === 'string'
  )
}

function isValidPlanItem(item: unknown): item is PlanItem {
  if (!item || typeof item !== 'object') return false
  const candidate = item as Partial<PlanItem>
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.title === 'string' &&
    typeof candidate.subtitle === 'string' &&
    ['book', 'game', 'anime', 'drama', 'movie', 'action'].includes(candidate.type ?? '') &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.cover === 'string' &&
    (candidate.plannedAt === undefined || typeof candidate.plannedAt === 'string')
  )
}

function parseImportedBackup(data: unknown) {
  const payload = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)
      ? (data as { items: unknown[] }).items
      : null
  const planPayload = data && typeof data === 'object' && Array.isArray((data as { planItems?: unknown }).planItems)
    ? (data as { planItems: unknown[] }).planItems
    : []

  if (!payload || !payload.every(isValidStoredItem)) {
    throw new Error('invalid backup')
  }
  if (!planPayload.every(isValidPlanItem)) {
    throw new Error('invalid backup')
  }

  return { items: normalizeItems(payload), planItems: planPayload }
}

function dateDiff(date?: string) {
  if (!date) return 0
  const from = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - from.getTime()) / DAY))
}

function dateTime(date?: string) {
  return date ? new Date(`${date}T00:00:00`).getTime() : 0
}

function getLatestItemTime(item: Item) {
  const latestHistoryTime = item.history.reduce((latest, log) => Math.max(latest, dateTime(log.date)), 0)
  return Math.max(dateTime(item.lastActiveAt), dateTime(item.purchasedAt), latestHistoryTime)
}

function sortItemsByLatestActivity(items: Item[]) {
  return [...items].sort((a, b) => {
    const latestTimeDiff = getLatestItemTime(b) - getLatestItemTime(a)
    return latestTimeDiff || b.id - a.id
  })
}

function sortItemsByRegistration(items: Item[]) {
  return [...items].sort((a, b) => {
    const registrationTimeDiff = dateTime(a.purchasedAt) - dateTime(b.purchasedAt)
    return registrationTimeDiff || a.id - b.id
  })
}

function getAttentionDays(item: Item) {
  return item.status === 'unstarted' ? dateDiff(item.purchasedAt) : dateDiff(item.lastActiveAt)
}

function sortItemsByAttention(items: Item[]) {
  return [...items].sort((a, b) => {
    const attentionDiff = getAttentionDays(b) - getAttentionDays(a)
    return attentionDiff || getLatestItemTime(a) - getLatestItemTime(b) || a.id - b.id
  })
}

function sortItemsByCompletion(items: Item[]) {
  return [...items].sort((a, b) => {
    const completionTimeDiff = dateTime(b.completedAt) - dateTime(a.completedAt)
    return completionTimeDiff || getLatestItemTime(b) - getLatestItemTime(a) || b.id - a.id
  })
}

function sortPlanItemsByTiming(plans: PlanItem[]) {
  return [...plans].sort((a, b) => {
    if (a.plannedAt && b.plannedAt) {
      const plannedTimeDiff = dateTime(a.plannedAt) - dateTime(b.plannedAt)
      return plannedTimeDiff || dateTime(a.createdAt) - dateTime(b.createdAt) || a.id - b.id
    }
    if (a.plannedAt) return -1
    if (b.plannedAt) return 1
    return dateTime(a.createdAt) - dateTime(b.createdAt) || a.id - b.id
  })
}

function daysUntil(date: string) {
  const target = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / DAY)
}

function formatPlanTiming(plan: PlanItem) {
  if (!plan.plannedAt) return '無期限'
  const days = daysUntil(plan.plannedAt)
  if (days < 0) return `${Math.abs(days)}日過ぎています`
  if (days === 0) return '今日開始予定'
  if (days === 1) return '明日開始予定'
  if (days <= planAlertWindowDays) return `${days}日後に開始`
  return `${formatJapaneseDate(plan.plannedAt)}開始予定`
}

function isPlanAlert(plan: PlanItem) {
  return !!plan.plannedAt && daysUntil(plan.plannedAt) <= planAlertWindowDays
}

function getProgress(item: Item) {
  if (item.totalAmount <= 0) return 0
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

function formatRating(rating?: number) {
  if (!rating) return ''
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`
}

function isEpisodeType(type: ItemType) {
  return type === 'anime' || type === 'drama'
}

function isSingleActionType(type: ItemType) {
  return type === 'movie' || type === 'action'
}

function getTypeMeta(type: ItemType) {
  if (type === 'book') return 'BOOK'
  if (type === 'game') return 'GAME'
  if (type === 'anime') return 'ANIME'
  if (type === 'movie') return 'MOVIE'
  if (type === 'action') return 'ACTION'
  return 'DRAMA'
}

function getUnit(type: ItemType) {
  if (type === 'book') return 'ページ'
  if (type === 'game') return '時間'
  if (type === 'movie') return '本'
  if (type === 'action') return '回'
  return '話'
}

function TypeIcon({ type, size }: { type: ItemType; size: number }) {
  if (type === 'book') return <BookOpen size={size} />
  if (type === 'game') return <Gamepad2 size={size} />
  if (type === 'anime') return <Clapperboard size={size} />
  if (type === 'movie') return <Film size={size} />
  if (type === 'action') return <CircleCheck size={size} />
  return <Tv size={size} />
}

function App() {
  const [items, setItems] = useState<Item[]>(loadItems)
  const [planItems, setPlanItems] = useState<PlanItem[]>(loadPlanItems)
  const [tab, setTab] = useState<Tab>('home')
  const [librarySection, setLibrarySection] = useState<LibrarySection>('active')
  const [selectedTypes, setSelectedTypes] = useState<ItemType[]>([])
  const [query, setQuery] = useState('')
  const [showAddChoice, setShowAddChoice] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [progressItem, setProgressItem] = useState<Item | null>(null)
  const [detailItemId, setDetailItemId] = useState<number | null>(null)

  const alerts = useMemo(
    () =>
      sortItemsByAttention(
        items.filter((item) => {
          if (item.status === 'completed') return false
          if (item.status === 'unstarted') return true
          return dateDiff(item.lastActiveAt) >= staleAfterDays
        }),
      ),
    [items],
  )
  const planAlerts = useMemo(() => sortPlanItemsByTiming(planItems.filter(isPlanAlert)), [planItems])
  const alertCount = alerts.length + planAlerts.length
  const heroRecommendation = useMemo(() => {
    const overduePlan = planAlerts.find((plan) => plan.plannedAt && daysUntil(plan.plannedAt) < 0)
    if (overduePlan) {
      return {
        title: overduePlan.title,
        message: '開始予定を過ぎています',
      }
    }
    if (alerts[0]) {
      return {
        title: alerts[0].title,
        message: alerts[0].status === 'unstarted' ? 'そろそろ始めませんか？' : '少しだけでも進めませんか？',
        item: alerts[0],
      }
    }
    if (planAlerts[0]) {
      return {
        title: planAlerts[0].title,
        message: '開始予定が近づいています',
      }
    }
    return null
  }, [alerts, planAlerts])

  const visibleItems = useMemo(
    () => {
      const filteredItems = items.filter((item) => {
        const matchesFilter = selectedTypes.length === 0 || selectedTypes.includes(item.type)
        const matchesQuery = `${item.title} ${item.subtitle}`.toLowerCase().includes(query.toLowerCase())
        const matchesTab = tab !== 'alerts' || alerts.some((alert) => alert.id === item.id)
        const matchesLibrarySection = tab !== 'library' || (librarySection === 'active' ? item.status !== 'completed' : librarySection === 'completed' && item.status === 'completed')
        return matchesFilter && matchesQuery && matchesTab && matchesLibrarySection
      })
      return tab === 'library' && librarySection === 'completed'
        ? sortItemsByCompletion(filteredItems)
        : sortItemsByLatestActivity(filteredItems)
    },
    [alerts, items, librarySection, query, selectedTypes, tab],
  )
  const visiblePlanItems = useMemo(
    () =>
      (tab === 'library' || tab === 'alerts'
        ? sortPlanItemsByTiming(
          planItems.filter((plan) => {
            const matchesFilter = selectedTypes.length === 0 || selectedTypes.includes(plan.type)
            const matchesQuery = `${plan.title} ${plan.subtitle}`.toLowerCase().includes(query.toLowerCase())
            const matchesTab = tab !== 'alerts' || planAlerts.some((alert) => alert.id === plan.id)
            const matchesLibrarySection = tab !== 'library' || librarySection === 'plan'
            return matchesFilter && matchesQuery && matchesTab && matchesLibrarySection
          }),
        )
        : []),
    [librarySection, planAlerts, planItems, query, selectedTypes, tab],
  )

  const toggleTypeFilter = (type: ItemType) => {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((value) => value !== type) : [...current, type],
    )
  }

  const persist = (next: Item[]) => {
    setItems(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }
  const persistPlans = (next: PlanItem[]) => {
    setPlanItems(next)
    localStorage.setItem(planStorageKey, JSON.stringify(next))
  }

  const updateProgress = (
    id: number,
    entry: { amount: number; comment?: string; rating?: number; complete?: boolean; extensionAmount?: number },
  ) => {
    const today = new Date().toISOString().slice(0, 10)
    persist(
      items.map((item) => {
        if (item.id !== id) return item
        if (entry.extensionAmount) {
          const nextTotal = item.totalAmount + entry.extensionAmount
          return {
            ...item,
            totalAmount: nextTotal,
            history: [
              {
                id: Date.now(),
                date: today,
                amount: entry.extensionAmount,
                currentAmount: item.currentAmount,
                totalAmount: nextTotal,
                comment: entry.comment,
                kind: 'extension',
              },
              ...item.history,
            ],
          }
        }

        const nextAmount = entry.complete ? item.totalAmount : Math.min(entry.amount, item.totalAmount)
        const change = nextAmount - item.currentAmount
        const completed = nextAmount >= item.totalAmount
        return {
          ...item,
          currentAmount: nextAmount,
          status: completed ? 'completed' : nextAmount > 0 ? 'active' : 'unstarted',
          lastActiveAt: today,
          rating: completed ? entry.rating : item.rating,
          completedAt: completed ? today : item.completedAt,
          history: change === 0
            ? item.history
            : [
              {
                id: Date.now(),
                date: today,
                amount: change,
                currentAmount: nextAmount,
                totalAmount: item.totalAmount,
                comment: entry.comment,
                rating: completed ? entry.rating : undefined,
                kind: completed ? 'completion' : 'progress',
              },
              ...item.history,
            ],
        }
      }),
    )
    setProgressItem(null)
  }

  const addItem = (item: Omit<Item, 'id' | 'status' | 'currentAmount' | 'history'>) => {
    const id = Date.now()
    persist([
      {
        ...item,
        id,
        status: 'unstarted',
        currentAmount: 0,
        history: [registrationLog({ id, purchasedAt: item.purchasedAt })],
      },
      ...items,
    ])
    setShowAdd(false)
  }

  const addPlanItem = (plan: Omit<PlanItem, 'id' | 'createdAt'>) => {
    persistPlans([
      {
        ...plan,
        id: Date.now(),
        createdAt: new Date().toISOString().slice(0, 10),
      },
      ...planItems,
    ])
    setShowAddPlan(false)
  }

  const demoteItem = (item: Item) => {
    if (item.currentAmount > 0 && !window.confirm('記録済みの進捗は予備軍には引き継がれません。予備軍に戻しますか？')) return
    const nextPlan: PlanItem = {
      id: Date.now(),
      title: item.title,
      subtitle: item.subtitle,
      type: item.type,
      createdAt: new Date().toISOString().slice(0, 10),
      cover: item.cover,
    }
    persistPlans([nextPlan, ...planItems])
    persist(items.filter((candidate) => candidate.id !== item.id))
    setDetailItemId(null)
  }

  const promotePlanItem = (plan: PlanItem) => {
    const today = new Date().toISOString().slice(0, 10)
    const id = Date.now()
    persist([
      {
        id,
        title: plan.title,
        subtitle: plan.subtitle,
        type: plan.type,
        status: 'unstarted',
        totalAmount: getDefaultTotal(plan.type),
        currentAmount: 0,
        purchasedAt: today,
        cover: plan.cover,
        history: [registrationLog({ id, purchasedAt: today })],
      },
      ...items,
    ])
    persistPlans(planItems.filter((item) => item.id !== plan.id))
  }

  const deleteItem = (id: number) => {
    persist(items.filter((item) => item.id !== id))
    setDetailItemId(null)
  }

  const importBackup = (nextItems: Item[], nextPlanItems: PlanItem[]) => {
    persistPlans(nextPlanItems)
    persist(nextItems)
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
            {alertCount > 0 && <span className="notification-dot" />}
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
                <h2>{heroRecommendation?.title ?? '積みはありません'}</h2>
                <span>{heroRecommendation?.message ?? 'この調子で楽しみましょう'}</span>
              </div>
              <HeroBookStack items={items} />
              {heroRecommendation?.item && (
                <button className="hero-action" onClick={() => setProgressItem(heroRecommendation.item)}>
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

          {tab === 'library' && (
            <div className="library-section-row" aria-label="ライブラリ区分">
              {([
                ['plan', '予備軍'],
                ['active', '積み中'],
                ['completed', '消化済'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={librarySection === value ? 'active' : ''}
                  onClick={() => setLibrarySection(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="filter-row">
            {(['book', 'game', 'anime', 'drama', 'movie', 'action'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={selectedTypes.includes(value) ? 'filter active' : 'filter'}
                aria-pressed={selectedTypes.includes(value)}
                onClick={() => toggleTypeFilter(value)}
              >
                {value === 'book' ? '読書' : value === 'game' ? 'ゲーム' : value === 'anime' ? 'アニメ' : value === 'drama' ? 'ドラマ' : value === 'movie' ? '映画' : '行動'}
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
                onDemote={() => demoteItem(item)}
              />
            ))}
            {visiblePlanItems.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onPromote={() => promotePlanItem(plan)}
              />
            ))}
            {visibleItems.length === 0 && visiblePlanItems.length === 0 && (
              <div className="empty-state">
                <Check size={26} />
                <strong>対象の積みはありません</strong>
                <span>{tab === 'alerts' ? '今すぐ気にする項目はありません。' : '新しく買った作品や予定を登録しておきましょう。'}</span>
              </div>
            )}
          </div>
        </section>
      </main>

      <button className="fab" aria-label="新しく登録" onClick={() => setShowAddChoice(true)}><Plus size={24} /></button>

      <nav className="bottom-nav">
        <NavButton active={tab === 'home'} label="ホーム" icon={<Home size={20} />} onClick={() => setTab('home')} />
        <NavButton active={tab === 'library'} label="ライブラリ" icon={<Library size={20} />} onClick={() => setTab('library')} />
        <NavButton active={tab === 'alerts'} label="アラート" icon={<Bell size={20} />} badge={alertCount} onClick={() => setTab('alerts')} />
      </nav>

      {showAddChoice && (
        <AddChoiceSheet
          onClose={() => setShowAddChoice(false)}
          onAddItem={() => {
            setShowAddChoice(false)
            setShowAdd(true)
          }}
          onAddPlan={() => {
            setShowAddChoice(false)
            setShowAddPlan(true)
          }}
        />
      )}
      {showAdd && <AddSheet onClose={() => setShowAdd(false)} onAdd={addItem} />}
      {showAddPlan && <AddPlanSheet onClose={() => setShowAddPlan(false)} onAdd={addPlanItem} />}
      {showSettings && <SettingsSheet items={items} planItems={planItems} onClose={() => setShowSettings(false)} onImport={importBackup} />}
      {detailItem && (
        <HistorySheet
          item={detailItem}
          onClose={() => setDetailItemId(null)}
          onProgress={() => {
            setDetailItemId(null)
            setProgressItem(detailItem)
          }}
          onDelete={() => deleteItem(detailItem.id)}
          onDemote={() => demoteItem(detailItem)}
        />
      )}
      {progressItem && <ProgressSheet item={progressItem} onClose={() => setProgressItem(null)} onSave={updateProgress} />}
    </div>
  )
}

function HeroBookStack({ items }: { items: Item[] }) {
  const booksPerStack = 7
  const maxStacks = 3
  const maxBooks = booksPerStack * maxStacks
  const activeStackItems = sortItemsByRegistration(items.filter((item) => item.status !== 'completed'))
  const hiddenCount = Math.max(0, activeStackItems.length - maxBooks)
  const stackItems = items.length
    ? activeStackItems.slice(-maxBooks)
    : [
      { id: 1, cover: 'cover-orange' },
      { id: 2, cover: 'cover-blue' },
      { id: 3, cover: 'cover-green' },
      { id: 4, cover: 'cover-purple' },
    ]

  return (
    <div className="book-stack" aria-hidden="true">
      {stackItems.map((item, index) => {
        const stackIndex = Math.floor(index / booksPerStack)
        const positionInStack = index % booksPerStack
        const stackCount = Math.max(1, Math.ceil(stackItems.length / booksPerStack))
        const stackOffset = maxStacks - stackCount
        const left = (stackIndex + stackOffset) * 39 + (positionInStack % 2 === 0 ? 0 : 3)
        const top = 101 - positionInStack * 14
        const width = 43 + (positionInStack % 3) * 6
        const rotate = positionInStack % 2 === 0 ? -1.4 : 1.4

        return (
          <span
            key={item.id}
            className={`stack-book ${item.cover}`}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              opacity: 1,
              transform: `rotate(${rotate}deg)`,
              zIndex: stackIndex * booksPerStack + positionInStack,
            }}
          >
            <i />
          </span>
        )
      })}
      {hiddenCount > 0 && <span className="stack-overflow">+{hiddenCount}</span>}
    </div>
  )
}

function SettingsSheet({
  items,
  planItems,
  onClose,
  onImport,
}: {
  items: Item[]
  planItems: PlanItem[]
  onClose: () => void
  onImport: (items: Item[], planItems: PlanItem[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  const exportItems = () => {
    const backup = {
      app: 'tsumilog',
      version: exportVersion,
      exportedAt: new Date().toISOString(),
      items,
      planItems,
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
      const { items: nextItems, planItems: nextPlanItems } = parseImportedBackup(data)
      if (!window.confirm('現在の積みログを読み込んだデータで置き換えますか？')) return
      onImport(nextItems, nextPlanItems)
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

function PlanCard({ plan, onPromote }: { plan: PlanItem; onPromote: () => void }) {
  const urgent = isPlanAlert(plan)

  return (
    <article className={urgent ? 'item-card plan-card urgent' : 'item-card plan-card'}>
      <div className={`cover ${plan.cover}`}>
        <TypeIcon type={plan.type} size={25} />
      </div>
      <div className="item-body">
        <div className="item-meta">
          <span>{getTypeMeta(plan.type)} / PLAN</span>
          <span className={urgent ? 'plan-timing urgent' : 'plan-timing'}>{formatPlanTiming(plan)}</span>
        </div>
        <h3>{plan.title}</h3>
        <p>{plan.subtitle}</p>
        <div className="plan-status">
          <span>積み予備軍</span>
          <strong>{plan.plannedAt ? formatJapaneseDate(plan.plannedAt) : '無期限'}</strong>
        </div>
        <div className="quick-actions">
          <button type="button" onClick={onPromote}>積みに登録</button>
        </div>
      </div>
    </article>
  )
}

function ItemCard({ item, onOpen, onProgress, onDemote }: { item: Item; onOpen: () => void; onProgress: () => void; onDemote: () => void }) {
  const inactiveDays = dateDiff(item.lastActiveAt)
  const warning = item.status === 'active' && inactiveDays >= staleAfterDays
  const progress = getProgress(item)
  const unit = getUnit(item.type)
  const isSingleAction = isSingleActionType(item.type)
  const isAction = item.type === 'action'

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
        {item.rating && <span className="item-rating">{formatRating(item.rating)}</span>}
        {warning && <span className="warning">{inactiveDays}日空いています</span>}
        <div className="progress-heading">
          <span>{isSingleAction ? item.status === 'completed' ? isAction ? '実行済み' : '視聴済み' : isAction ? '未実行' : '未視聴' : item.status === 'unstarted' ? '未開始' : item.status === 'completed' ? '完了' : '進捗'}</span>
          <strong>{isSingleAction ? item.status === 'completed' ? `1${unit} · 100%` : `0${unit} · 0%` : `${formatAmount(item.currentAmount)} / ${formatAmount(item.totalAmount)}${unit} · ${progress}%`}</strong>
        </div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        {item.status !== 'completed' && (
          <div className="quick-actions">
            <button onClick={(event) => { event.stopPropagation(); onProgress() }}>
              {item.type === 'book' ? '読んだページを記録' : item.type === 'game' ? 'プレイ時間を記録' : item.type === 'movie' ? '見たことを記録' : item.type === 'action' ? 'やったことを記録' : '見た話数を記録'}
            </button>
            <button onClick={(event) => { event.stopPropagation(); onDemote() }}>
              予備軍に戻す
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

function HistorySheet({ item, onClose, onProgress, onDelete, onDemote }: { item: Item; onClose: () => void; onProgress: () => void; onDelete: () => void; onDemote: () => void }) {
  const isBook = item.type === 'book'
  const isGame = item.type === 'game'
  const isMovie = item.type === 'movie'
  const isAction = item.type === 'action'
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
                    {log.kind === 'extension'
                      ? `想定を${formatAmount(log.amount)}${unit}延長した`
                      : log.kind === 'registration'
                        ? '積みに追加した'
                      : log.kind === 'completion'
                        ? `${formatAmount(log.amount)}${unit}${isBook ? '読み切った' : isGame ? 'プレイして完了した' : isAction ? 'やり終えた' : '見終えた'}`
                        : log.amount >= 0
                      ? `${formatAmount(log.amount)}${unit}${isBook ? '読み進めた' : isGame ? 'プレイした' : isAction ? 'やった' : isMovie ? '見た' : '見た'}`
                      : `${formatAmount(Math.abs(log.amount))}${unit}分、進捗を修正した`}
                  </strong>
                  {log.rating && <span className="history-rating">{formatRating(log.rating)}</span>}
                  {log.comment && <p>{log.comment}</p>}
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
        {item.status !== 'completed' && (
          <div className="detail-actions">
            <button className="primary-button" type="button" onClick={onProgress}>進捗を記録する</button>
            <button className="secondary-button" type="button" onClick={onDemote}>予備軍に戻す</button>
          </div>
        )}
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

function AddChoiceSheet({
  onClose,
  onAddItem,
  onAddPlan,
}: {
  onClose: () => void
  onAddItem: () => void
  onAddPlan: () => void
}) {
  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section className="sheet add-choice-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div><p className="eyebrow">ADD ITEM</p><h2>追加先を選ぶ</h2></div>
          <button type="button" className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="add-choice-actions">
          <button type="button" onClick={onAddItem}>
            <Plus size={18} />
            <span><strong>積みに登録</strong><small>すぐ進めたい作品や行動を追加します</small></span>
          </button>
          <button type="button" onClick={onAddPlan}>
            <Library size={18} />
            <span><strong>予備軍に追加</strong><small>いつか触れたい候補として置いておきます</small></span>
          </button>
        </div>
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

function AddSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (item: Omit<Item, 'id' | 'status' | 'currentAmount' | 'history'>) => void }) {
  const [type, setType] = useState<ItemType>('book')
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().slice(0, 10))
  const [cover, setCover] = useState(coverOptions[0])
  const isSingleAction = isSingleActionType(type)
  const isMovie = type === 'movie'
  const isAction = type === 'action'

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <form
        className="sheet add-sheet"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          const parsedTotal = isSingleAction ? 1 : Number(totalAmount)
          if (!title.trim() || parsedTotal <= 0) return
          onAdd({ title: title.trim(), subtitle: subtitle.trim(), type, totalAmount: parsedTotal, purchasedAt, cover })
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
          <button type="button" className={type === 'movie' ? 'active' : ''} onClick={() => { setType('movie'); setTotalAmount('') }}><Film size={18} /> 映画</button>
          <button type="button" className={type === 'action' ? 'active' : ''} onClick={() => { setType('action'); setTotalAmount('') }}><CircleCheck size={18} /> 行動</button>
        </div>
        <label>{isAction ? 'やりたいこと' : 'タイトル'}<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={isAction ? '例: パスポートを更新する' : '作品名を入力'} /></label>
        <label>{type === 'book' ? '著者' : type === 'game' ? 'プラットフォーム' : isMovie ? '視聴サービス・媒体' : isAction ? '場所・メモ' : '配信サービスなど'}<input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder={type === 'book' ? '著者名' : type === 'game' ? 'Steam / Switch など' : isMovie ? '映画館 / Netflix / Blu-ray など' : isAction ? '役所 / 週末 / 必要なもの など' : 'Netflix / TV など'} /></label>
        {!isSingleAction && (
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
        )}
        <label>登録日<input type="date" value={purchasedAt} onChange={(event) => setPurchasedAt(event.target.value)} /></label>
        <fieldset className="cover-picker">
          <legend>色</legend>
          <div>
            {coverOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={cover === option ? 'active' : ''}
                aria-label={`色 ${coverOptions.indexOf(option) + 1}`}
                aria-pressed={cover === option}
                onClick={() => setCover(option)}
              >
                <span className={option} />
              </button>
            ))}
          </div>
        </fieldset>
        <button className="primary-button" type="submit">積みログに追加する</button>
      </form>
    </div>
  )
}

function AddPlanSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (plan: Omit<PlanItem, 'id' | 'createdAt'>) => void }) {
  const [type, setType] = useState<ItemType>('movie')
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [scheduleMode, setScheduleMode] = useState<'date' | 'none'>('date')
  const [plannedAt, setPlannedAt] = useState(new Date().toISOString().slice(0, 10))
  const [cover, setCover] = useState(coverOptions[1])
  const isMovie = type === 'movie'
  const isAction = type === 'action'

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <form
        className="sheet add-sheet"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (!title.trim()) return
          onAdd({
            title: title.trim(),
            subtitle: subtitle.trim(),
            type,
            plannedAt: scheduleMode === 'date' ? plannedAt : undefined,
            cover,
          })
        }}
      >
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div><p className="eyebrow">PLAN SOMEDAY</p><h2>積み予備軍</h2></div>
          <button type="button" className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="type-toggle">
          <button type="button" className={type === 'book' ? 'active' : ''} onClick={() => setType('book')}><BookOpen size={18} /> 読書</button>
          <button type="button" className={type === 'game' ? 'active' : ''} onClick={() => setType('game')}><Gamepad2 size={18} /> ゲーム</button>
          <button type="button" className={type === 'anime' ? 'active' : ''} onClick={() => setType('anime')}><Clapperboard size={18} /> アニメ</button>
          <button type="button" className={type === 'drama' ? 'active' : ''} onClick={() => setType('drama')}><Tv size={18} /> ドラマ</button>
          <button type="button" className={type === 'movie' ? 'active' : ''} onClick={() => setType('movie')}><Film size={18} /> 映画</button>
          <button type="button" className={type === 'action' ? 'active' : ''} onClick={() => setType('action')}><CircleCheck size={18} /> 行動</button>
        </div>
        <label>{isAction ? 'やりたいこと' : 'タイトル'}<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={isAction ? '例: 机まわりを片付ける' : 'いつか触れたい作品名'} /></label>
        <label>{type === 'book' ? '著者・メモ' : type === 'game' ? 'プラットフォーム・メモ' : isMovie ? '視聴サービス・媒体' : isAction ? '場所・メモ' : '配信サービス・メモ'}<input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder={type === 'book' ? '著者名 / 気になった理由' : type === 'game' ? 'Steam / Switch など' : isMovie ? '映画館 / Netflix / Blu-ray など' : isAction ? '家 / 外出時 / 必要なもの など' : 'Netflix / TV など'} /></label>
        <fieldset className="schedule-picker">
          <legend>開始予定</legend>
          <div className="progress-mode-actions">
            <button type="button" className={scheduleMode === 'date' ? 'active' : ''} onClick={() => setScheduleMode('date')}>日付指定</button>
            <button type="button" className={scheduleMode === 'none' ? 'active' : ''} onClick={() => setScheduleMode('none')}>無期限</button>
          </div>
          {scheduleMode === 'date' && <input type="date" value={plannedAt} onChange={(event) => setPlannedAt(event.target.value)} />}
        </fieldset>
        <fieldset className="cover-picker">
          <legend>色</legend>
          <div>
            {coverOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={cover === option ? 'active' : ''}
                aria-label={`色 ${coverOptions.indexOf(option) + 1}`}
                aria-pressed={cover === option}
                onClick={() => setCover(option)}
              >
                <span className={option} />
              </button>
            ))}
          </div>
        </fieldset>
        <button className="primary-button" type="submit">予備軍に追加する</button>
      </form>
    </div>
  )
}

function ProgressSheet({
  item,
  onClose,
  onSave,
}: {
  item: Item
  onClose: () => void
  onSave: (
    id: number,
    entry: { amount: number; comment?: string; rating?: number; complete?: boolean; extensionAmount?: number },
  ) => void
}) {
  const [value, setValue] = useState('')
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(0)
  const [mode, setMode] = useState<'progress' | 'extension'>('progress')
  const [completeRequested, setCompleteRequested] = useState(isSingleActionType(item.type))
  const isBook = item.type === 'book'
  const isGame = item.type === 'game'
  const isSingleAction = isSingleActionType(item.type)
  const isAction = item.type === 'action'
  const isCumulative = isBook || isEpisodeType(item.type)
  const unit = getUnit(item.type)
  const parsedValue = Number(value)
  const nextAmount = isCumulative ? parsedValue : item.currentAmount + parsedValue
  const willComplete = mode === 'progress' && (completeRequested || (!!value && nextAmount >= item.totalAmount))
  const cleanComment = comment.trim() || undefined

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <form
        className="sheet progress-sheet"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          if (mode === 'extension') {
            if (parsedValue <= 0 || !value) return
            onSave(item.id, { amount: item.currentAmount, extensionAmount: parsedValue, comment: cleanComment })
            return
          }

          if (completeRequested) {
            if (rating === 0) return
            onSave(item.id, { amount: item.totalAmount, comment: cleanComment, rating, complete: true })
            return
          }

          if (parsedValue < 0 || !value) return
          if (willComplete && rating === 0) return
          onSave(item.id, {
            amount: nextAmount,
            comment: cleanComment,
            rating: willComplete ? rating : undefined,
          })
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
        {!isSingleAction && (
          <div className="progress-mode-actions">
            <button
              type="button"
              className={mode === 'progress' && !completeRequested ? 'active' : ''}
              onClick={() => { setMode('progress'); setValue(''); setCompleteRequested(false) }}
            >
              記録
            </button>
            <button
              type="button"
              className={mode === 'extension' ? 'active' : ''}
              onClick={() => { setMode('extension'); setValue(''); setCompleteRequested(false); setRating(0) }}
            >
              延長
            </button>
            <button
              type="button"
              className={completeRequested ? 'active' : ''}
              onClick={() => { setMode('progress'); setValue(''); setCompleteRequested(true) }}
            >
              完了
            </button>
          </div>
        )}
        {isSingleAction ? (
          <div className="completion-note">
            <strong>{isAction ? '実行済みにします' : '視聴済みにします'}</strong>
            <span>評価と一言メモを残せます。</span>
          </div>
        ) : (
          <label>{mode === 'extension' ? `どれだけ延長しますか？` : completeRequested ? '完了として記録します' : isBook ? '何ページまで読みましたか？' : isGame ? '今日、何時間プレイしましたか？' : '何話まで見ましたか？'}
            <input
              type="number"
              min="0"
              max={mode === 'progress' && isCumulative ? item.totalAmount : undefined}
              step={isGame ? '0.5' : '1'}
              value={value}
              onChange={(event) => { setValue(event.target.value); setCompleteRequested(false) }}
              placeholder={mode === 'extension' ? (isGame ? '例: 5' : '例: 1') : isBook ? `例: ${Math.min(item.currentAmount + 20, item.totalAmount)}` : isGame ? '例: 1.5' : `例: ${Math.min(item.currentAmount + 1, item.totalAmount)}`}
              disabled={completeRequested}
              autoFocus
              required={!completeRequested}
            />
            <span className="field-hint">
              {mode === 'extension'
                ? `現在の想定 ${formatAmount(item.totalAmount)}${unit}`
                : completeRequested
                  ? `${formatAmount(item.totalAmount)}${unit}まで進めた扱いにします`
                  : isBook ? `全${formatAmount(item.totalAmount)}ページ` : isGame ? `想定クリア時間 ${formatAmount(item.totalAmount)}時間` : `全${formatAmount(item.totalAmount)}話`}
            </span>
          </label>
        )}
        {(willComplete || completeRequested) && (
          <fieldset className="rating-picker">
            <legend>評価</legend>
            <div>
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  className={rating >= score ? 'active' : ''}
                  aria-label={`${score}つ星`}
                  aria-pressed={rating === score}
                  onClick={() => setRating(score)}
                >
                  ★
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <label>コメント
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="任意で一言メモ"
            rows={3}
          />
        </label>
        <button className="primary-button" type="submit">{mode === 'extension' ? '延長する' : completeRequested ? '完了を記録する' : '記録する'}</button>
      </form>
    </div>
  )
}

export default App
