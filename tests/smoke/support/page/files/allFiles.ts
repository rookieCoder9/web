import { Download } from 'playwright'
import { User, Actor, File } from '../../types'
import { cta } from '../../cta'
import path from 'path'

export class AllFilesPage {
  private readonly actor: Actor

  constructor({ actor }: { actor: Actor }) {
    this.actor = actor
  }

  async navigate(): Promise<void> {
    const { page } = this.actor
    
    const allFilesBtn = page.locator('a[href="#/files/list/all"]')
    await allFilesBtn.click()
  }

  async createFolder({ name }: { name: string }): Promise<void> {
    const { page } = this.actor

    const paths = name.split('/')
    const startUrl = page.url()

    for (const folderName of paths) {
      const folderExists = await cta.files.resourceExists({
        page: page,
        name: folderName
      })

      if (!folderExists) {
        await page.click('#new-file-menu-btn')
        await page.click('#new-folder-btn')
        await page.fill('.oc-modal input', folderName)
        await page.click('.oc-modal-body-actions-confirm')
      }

      await cta.files.navigateToFolder({ page: page, path: folderName })
    }

    await page.goto(startUrl)
    await page.waitForSelector('#files-personal-table')
  }

  async uploadFiles({
    files,
    folder,
    newVersion
  }: {
    files: File[]
    folder?: string
    newVersion?: boolean
  }): Promise<void> {
    const { page } = this.actor
    const startUrl = page.url()

    if (folder) {
      await cta.files.navigateToFolder({ page: page, path: folder })
    }

    await page.click('#new-file-menu-btn')
    await page.setInputFiles(
      '#fileUploadInput',
      files.map((file) => file.path)
    )

    if (newVersion) {
      const fileName = files.map((file) => path.basename(file.name))
      await Promise.all([
        page.waitForResponse((resp) => resp.url().endsWith(fileName[0]) && resp.status() === 204),
        page.click('.oc-modal-body-actions-confirm')
      ])
    }

    await cta.files.waitForResources({
      page: page,
      names: files.map((file) => path.basename(file.name))
    })

    await page.goto(startUrl)
    await page.click('body')
  }

  async downloadFiles({ names, folder }: { names: string[]; folder: string }): Promise<Download[]> {
    const { page } = this.actor
    const startUrl = page.url()
    const downloads = []

    if (folder) {
      await cta.files.navigateToFolder({ page: page, path: folder })
    }

    for (const name of names) {
      await cta.files.sidebar.open({ page: page, resource: name })
      await cta.files.sidebar.openPanel({ page: page, name: 'actions' })

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('#oc-files-actions-sidebar .oc-files-actions-download-file-trigger')
      ])

      await cta.files.sidebar.close({ page: page })

      downloads.push(download)
    }

    await page.goto(startUrl)

    return downloads
  }

  async shareResouce({
    folder,
    users,
    role,
    via
  }: {
    folder: string
    users: User[]
    role: string
    via: 'SIDEBAR_PANEL' | 'QUICK_ACTION'
  }): Promise<void> {
    const { page } = this.actor
    const startUrl = page.url()
    const folderPaths = folder.split('/')
    const folderName = folderPaths.pop()

    if (folderPaths.length) {
      await cta.files.navigateToFolder({ page: page, path: folderPaths.join('/') })
    }
    switch (via) {
      case 'QUICK_ACTION':
        await page.click(
          `//*[@data-test-resource-name="${folderName}"]/ancestor::tr//button[contains(@class, "files-quick-action-collaborators")]`
        )
        break

      case 'SIDEBAR_PANEL':
        await cta.files.sidebar.open({ page: page, resource: folderName })
        await cta.files.sidebar.openPanel({ page: page, name: 'sharing' })
        break
    }
    await page.click('.files-collaborators-open-add-share-dialog-button')

    for (const user of users) {
      const shareInputLocator = page.locator('#files-share-invite-input')
      await Promise.all([
        page.waitForResponse((resp) => resp.url().includes('sharees') && resp.status() === 200),
        shareInputLocator.fill(user.displayName)
      ])
      await shareInputLocator.focus()
      await page.waitForSelector('.vs--open')
      await page.press('#files-share-invite-input', 'Enter')

      await page.click('//*[@id="files-collaborators-role-button"]')
      await page.click(`//*[@id="files-role-${role}"]`)
    }

    await page.click('#files-collaborators-collaborator-save-new-share-button')
    await cta.files.sidebar.close({ page: page })

    await page.goto(startUrl)
  }

  async renameResource({
    resource,
    newName
  }: {
    resource: string
    newName: string
  }): Promise<void> {
    const { page } = this.actor
    const startUrl = page.url()
    const { dir: resourceDir, base: resourceBase } = path.parse(resource)

    if (resourceDir) {
      await cta.files.navigateToFolder({ page: page, path: resourceDir })
    }

    await page.click(`//*[@data-test-resource-name="${resourceBase}"]`, { button: 'right' })
    await page.click('.oc-files-actions-rename-trigger')
    await page.fill('.oc-text-input', newName)
    await page.click('.oc-modal-body-actions-confirm')
    await cta.files.waitForResources({
      page: page,
      names: [newName]
    })
    await page.goto(startUrl)
  }

  async moveOrCopyResource({
    resource,
    newLocation,
    action
  }: {
    resource: string
    newLocation: string
    action: 'copy' | 'move'
  }): Promise<void> {
    const { page } = this.actor
    const startUrl = page.url()
    const { dir: resourceDir, base: resourceBase } = path.parse(resource)

    if (resourceDir) {
      await cta.files.navigateToFolder({ page: page, path: resourceDir })
    }

    await page.click(`//*[@data-test-resource-name="${resourceBase}"]`, { button: 'right' })
    await page.click(`.oc-files-actions-${action}-trigger`)
    await page.click('//ol[@class="oc-breadcrumb-list"]/li/*[1]')

    if (newLocation !== 'All files') {
      await cta.files.navigateToFolder({ page: page, path: newLocation })
    }

    await page.click('#location-picker-btn-confirm')
    await cta.files.waitForResources({
      page: page,
      names: [resourceBase]
    })
    await page.goto(startUrl)
  }

  async resourceExist({ name }: { name: string }): Promise<boolean> {
    const { page } = this.actor
    const folderPaths = name.split('/')
    const resouceName = folderPaths.pop()

    if (folderPaths.length) {
      await cta.files.navigateToFolder({ page: page, path: folderPaths.join('/') })
    }

    const resourceExists = await cta.files.resourceExists({
      page: page,
      name: resouceName
    })

    return resourceExists
  }

  async numberOfVersions({ resource }: { resource: string }): Promise<number> {
    const { page } = this.actor
    const folderPaths = resource.split('/')
    const resouceName = folderPaths.pop()

    if (folderPaths.length) {
      await cta.files.navigateToFolder({ page: page, path: folderPaths.join('/') })
    }

    await cta.files.sidebar.open({ page: page, resource: resouceName })
    await cta.files.sidebar.openPanel({ page: page, name: 'versions' })

    const elements = page.locator('//*[@id="oc-file-versions-sidebar"]/table/tbody/tr')
    return await elements.count()
  }

  async deleteResource({ resource }: { resource: string }): Promise<void> {
    const { page } = this.actor
    const startUrl = page.url()
    const folderPaths = resource.split('/')
    const resouceName = folderPaths.pop()

    if (folderPaths.length) {
      await cta.files.navigateToFolder({ page: page, path: folderPaths.join('/') })
    }

    const resourceCheckbox = `//*[@data-test-resource-name="${resouceName}"]//ancestor::tr//input`

    if (!(await page.isChecked(resourceCheckbox))) {
      await page.check(resourceCheckbox)
    }
    await page.click('button.oc-files-actions-delete-trigger')
    await page.click('.oc-modal-body-actions-confirm')

    await page.goto(startUrl)
  }

  async changeShareRole({
    folder,
    users,
    role
  }: {
    folder: string
    users: User[]
    role: string
  }): Promise<void> {
    const { page } = this.actor
    const startUrl = page.url()
    const folderPaths = folder.split('/')
    const folderName = folderPaths.pop()

    if (folderPaths.length) {
      await cta.files.navigateToFolder({ page: page, path: folderPaths.join('/') })
    }

    await cta.files.sidebar.open({ page: page, resource: folderName })
    await cta.files.sidebar.openPanel({ page: page, name: 'sharing' })

    await (await page.waitForSelector('//*[@data-testid="collaborators-show-people"]')).click()

    for (const user of users) {
      await page.click(`//*[@data-testid="recipient-${user.id}-btn-edit"]`)
      await page.click('//*[@id="files-collaborators-role-button"]')
      await page.click(`//*[@id="files-role-${role}"]`)
      await page.click('//*[@data-testid="recipient-edit-btn-save"]')
    }
    await page.goto(startUrl)
  }

  async deleteShare({ folder, users }: { folder: string; users: User[] }): Promise<void> {
    const { page } = this.actor
    const startUrl = page.url()
    const folderPaths = folder.split('/')
    const folderName = folderPaths.pop()

    if (folderPaths.length) {
      await cta.files.navigateToFolder({ page: page, path: folderPaths.join('/') })
    }

    await cta.files.sidebar.open({ page: page, resource: folderName })
    await cta.files.sidebar.openPanel({ page: page, name: 'sharing' })

    await page.click('//*[@data-testid="collaborators-show-people"]')

    for (const user of users) {
      const deleteButton = `//*[@data-testid="collaborator-item-${user.id}"]//button[contains(@class,"files-collaborators-collaborator-delete")]`
      await page.click(deleteButton)
    }
    await page.goto(startUrl)
  }
}
