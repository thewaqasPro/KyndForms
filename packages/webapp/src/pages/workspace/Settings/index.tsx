import { useTranslation } from 'react-i18next'

import BrandKitModal from './BrandKitModal'
import WorkspaceBranding from './Branding'
import WorkspaceDeletion from './Deletion'
import WorkspaceDeletionModal from './DeletionModal'
import WorkspaceGeneral from './General'

export default function WorkspaceSettings() {
  const { t } = useTranslation()

  return (
    <>
      <div className="w-full">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <h1 className="hf-page-title">{t('settings.title')}</h1>

          <hr className="border-accent-light my-6 w-full border-t" />

          <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
            <div className="flex-1 p-6">
              <WorkspaceGeneral />
              <WorkspaceBranding />
              <WorkspaceDeletion />
            </div>
          </div>
        </div>
      </div>

      <BrandKitModal />
      <WorkspaceDeletionModal />
    </>
  )
}
