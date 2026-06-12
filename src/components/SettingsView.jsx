import { useState, useEffect } from 'react'
import useStore from './../store/useStore'
import { MODULES_ENABLED, APP_NAME } from '../branding'
import { superListUsers } from '../lib/userAdmin'
import { getLastSeen } from './settings/lastSeen'
import { APP_VERSION, hasUnseenChangelog } from '../changelog'
import ChangelogView from './ChangelogView'
import AppearanceSection from './settings/AppearanceSection'
import HouseholdSection from './settings/HouseholdSection'
import BringSection from './settings/BringSection'
import CookidooSection from './settings/CookidooSection'
import ExportSection from './settings/ExportSection'
import SetupAssistantSection from './settings/SetupAssistantSection'
import InviteSection from './settings/InviteSection'
import MembersSection from './settings/MembersSection'
import SuperAdminSection from './settings/SuperAdminSection'

const SUPER_ADMIN_EMAIL = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || '').toLowerCase()


export default function SettingsView({ onClose }) {
  const { household, user } = useStore()
  const isOwner      = household?.role === 'owner'
  const isSuperAdmin = !!SUPER_ADMIN_EMAIL && (user?.email || '').toLowerCase() === SUPER_ADMIN_EMAIL
  const [tab, setTab] = useState('settings')  // 'settings' | 'admin' | 'super'
  const [newUserCount, setNewUserCount] = useState(0)
  const [showChangelog, setShowChangelog] = useState(false)
  const [unseenChangelog, setUnseenChangelog] = useState(hasUnseenChangelog())
  const showTabs = isOwner || isSuperAdmin

  // Beim Öffnen (als Super-Admin): zählen wie viele Nutzer seit dem letzten Besuch neu sind
  useEffect(() => {
    if (!isSuperAdmin) return
    const since = getLastSeen()
    superListUsers()
      .then(users => {
        const count = (users || []).filter(u => u.createdAt && u.createdAt > since).length
        setNewUserCount(count)
      })
      .catch(() => {})
  }, [isSuperAdmin])

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Einstellungen
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:bg-gray-700 transition-colors">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Tabs — für Owner und/oder Super-Admin */}
        {showTabs && (
          <div className="flex gap-1 px-5 pt-3 pb-1 flex-none">
            <button
              onClick={() => setTab('settings')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === 'settings'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              Allgemein
            </button>
            {isOwner && (
              <button
                onClick={() => setTab('admin')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  tab === 'admin'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                Mitglieder
              </button>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => { setTab('super'); setNewUserCount(0) }}
                className={`relative flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  tab === 'super'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                Betreiber
                {newUserCount > 0 && tab !== 'super' && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                    {newUserCount}
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {/* Einstellungen-Tab */}
        {tab === 'settings' && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-safe">
            <AppearanceSection />
            <div className="border-t border-gray-100 dark:border-gray-700" />
            <HouseholdSection />
            <div className="border-t border-gray-100 dark:border-gray-700" />
            <BringSection />
            <div className="border-t border-gray-100 dark:border-gray-700" />
            <CookidooSection />
            <div className="border-t border-gray-100 dark:border-gray-700" />
            <ExportSection />
            {MODULES_ENABLED && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-700" />
                <SetupAssistantSection onClose={onClose} />
              </>
            )}

            {/* Version + Changelog – dezent am Ende */}
            <div className="border-t border-gray-100 dark:border-gray-700" />
            <button
              onClick={() => setShowChangelog(true)}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors pb-2 relative"
            >
              {APP_NAME} v{APP_VERSION} · <span className="underline">Was ist neu?</span>
              {unseenChangelog && (
                <span className="inline-block w-1.5 h-1.5 bg-primary-500 rounded-full ml-1.5 align-middle" />
              )}
            </button>
          </div>
        )}

        {showChangelog && (
          <ChangelogView onClose={() => { setShowChangelog(false); setUnseenChangelog(false) }} />
        )}

        {/* Haushalts-Tab (nur Owner) */}
        {tab === 'admin' && isOwner && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-safe">
            <InviteSection />
            <div className="border-t border-gray-100 dark:border-gray-700" />
            <MembersSection />
          </div>
        )}

        {/* Betreiber-Tab (nur Super-Admin) */}
        {tab === 'super' && isSuperAdmin && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-safe">
            <SuperAdminSection />
          </div>
        )}
      </div>
    </>
  )
}
