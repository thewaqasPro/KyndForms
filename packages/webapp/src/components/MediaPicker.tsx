import { IconPhoto, IconSearch, IconTrash } from '@tabler/icons-react'
import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MediaItem, MediaService } from '@/services'
import { cn } from '@/utils'
import { formatBytes } from '@kyndform/utils'

import { useFormStore, useWorkspaceStore } from '@/store'

import { Async } from './Async'
import { EmptyState } from './EmptyState'
import { Input } from './Input'
import { Repeat } from './Repeat'

export interface MediaPickerProps extends Omit<ComponentProps, 'onChange'> {
  workspaceId?: string
  projectId?: string
  onChange?: (value: string) => void
}

const Skeleton = () => {
  return (
    <ul className="-ml-2 -mr-2 mt-4 flex flex-wrap">
      <Repeat count={12}>
        <li className="w-1/2 pb-4 pl-2 pr-2 sm:w-1/3 lg:w-1/4">
          <div className="skeleton block h-24 rounded-lg" />
        </li>
      </Repeat>
    </ul>
  )
}

interface MediaItemCardProps {
  item: MediaItem
  onSelect: (url: string) => void
  onDelete: (id: string) => Promise<void>
}

const MediaItemCard: FC<MediaItemCardProps> = ({ item, onSelect, onDelete }) => {
  const { t } = useTranslation()
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await onDelete(item.id)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete(false)
  }

  return (
    <li className="w-1/2 pb-4 pl-2 pr-2 sm:w-1/3 lg:w-1/4">
      <div
        className="border-input hover:border-primary group relative flex h-28 cursor-pointer flex-col overflow-hidden rounded-lg border bg-slate-50 transition-all duration-150 hover:shadow-md dark:bg-slate-900"
        onClick={() => onSelect(item.url)}
      >
        <div className="relative flex-1 overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={item.url}
            alt={item.filename}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />

          <div
            className={cn(
              'absolute right-1.5 top-1.5 z-10 transition-opacity',
              confirmDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            onClick={e => e.stopPropagation()}
          >
            {confirmDelete ? (
              <div className="flex items-center gap-1 rounded bg-black/80 p-1 shadow">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? '...' : t('components.remove')}
                </button>
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-slate-700"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-red-600 hover:text-white"
                title={t('components.remove')}
              >
                <IconTrash className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="border-accent-light bg-foreground border-t px-2 py-1 text-[11px] leading-tight">
          <p className="text-primary truncate font-medium" title={item.filename}>
            {item.filename}
          </p>
          {item.size > 0 && (
            <p className="text-secondary truncate text-[10px]">{formatBytes(item.size)}</p>
          )}
        </div>
      </div>
    </li>
  )
}

export const MediaPicker: FC<MediaPickerProps> = ({
  workspaceId: propWorkspaceId,
  projectId: propProjectId,
  onChange,
  ...restProps
}) => {
  const { t } = useTranslation()

  const formState = useFormStore(state => state.form)
  const currentWorkspaceId = useWorkspaceStore(state => state.currentWorkspaceId)
  const currentProjectId = useWorkspaceStore(state => state.currentProjectId)

  const resolvedTeamId = propWorkspaceId || formState?.teamId || currentWorkspaceId || ''
  const resolvedProjectId = propProjectId || formState?.projectId || currentProjectId || ''

  const [scope, setScope] = useState<'project' | 'workspace'>(
    resolvedProjectId ? 'project' : 'workspace'
  )
  const [keyword, setKeyword] = useState<string>('')
  const [items, setItems] = useState<MediaItem[]>([])

  async function fetch() {
    if (!resolvedTeamId) {
      setItems([])
      return false
    }

    const result = await MediaService.list({
      teamId: resolvedTeamId,
      projectId: scope === 'project' && resolvedProjectId ? resolvedProjectId : undefined,
      keyword: keyword.trim() || undefined
    })

    setItems(result)
    return result.length > 0
  }

  async function handleDelete(id: string) {
    if (!resolvedTeamId) return
    const success = await MediaService.delete(id, resolvedTeamId)
    if (success) {
      setItems(prev => prev.filter(i => i.id !== id))
    }
  }

  return (
    <div {...restProps}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Input
            className="[&_[data-slot=input]]:pl-10"
            placeholder={t('components.imagePicker.library.search', 'Search images...')}
            leading={<IconSearch className="text-secondary h-5 w-5" />}
            onEnter={setKeyword}
            onChange={(val: any) => {
              if (!val) setKeyword('')
            }}
          />
        </div>

        {resolvedProjectId && (
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-xs font-medium dark:bg-slate-800">
            <button
              type="button"
              className={cn(
                'rounded-md px-2.5 py-1 transition-colors',
                scope === 'project'
                  ? 'bg-foreground text-primary font-semibold shadow-sm'
                  : 'text-secondary hover:text-primary'
              )}
              onClick={() => setScope('project')}
            >
              {t('components.imagePicker.library.currentProject', 'Current Project')}
            </button>
            <button
              type="button"
              className={cn(
                'rounded-md px-2.5 py-1 transition-colors',
                scope === 'workspace'
                  ? 'bg-foreground text-primary font-semibold shadow-sm'
                  : 'text-secondary hover:text-primary'
              )}
              onClick={() => setScope('workspace')}
            >
              {t('components.imagePicker.library.allWorkspace', 'All Workspace')}
            </button>
          </div>
        )}
      </div>

      <Async
        fetch={fetch}
        refreshDeps={[keyword, scope, resolvedTeamId, resolvedProjectId]}
        loader={<Skeleton />}
        emptyRender={({ refresh }) => (
          <EmptyState
            className="flex h-64 flex-col items-center justify-center"
            icon={<IconPhoto className="h-10 w-10 stroke-1" />}
            headline={t('components.imagePicker.library.emptyState', 'No images found')}
            subHeadline={t(
              'components.imagePicker.library.emptyDescription',
              'Images uploaded in this project will appear here for easy reuse.'
            )}
            buttonTitle={t('components.refresh', 'Refresh')}
            onClick={refresh}
          />
        )}
      >
        <ul
          role="list"
          className="scrollbar -ml-2 -mr-2 mt-4 flex max-h-80 flex-wrap overflow-y-auto pr-1"
        >
          {items.map(row => (
            <MediaItemCard
              key={row.id}
              item={row}
              onSelect={url => onChange?.(url)}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      </Async>
    </div>
  )
}
