import { Actor } from '../../types'
import { filesCta } from '../../cta'
import { Locator } from '@playwright/test'
import { getActualExpiryDate } from '../../utils/datePicker'
import util = require('util')

export class PublicLink {
  private readonly actor: Actor
  private static lastCreatedPublicLink: string
  private readonly publicLinkButtonLocator: Locator
  private readonly publicLinkPasswordLocator: Locator
  private readonly publicLinkNameLocator: Locator
  private readonly roleDropdownLocator: Locator
  private readonly expirationDateDropdownLocator: Locator
  private readonly createLinkButtonLocator: Locator
  private readonly publicLinkLocator: Locator
  private readonly yearButtonLocator: Locator
  private readonly nextSpanYearLocator: Locator
  private readonly monthAndYearDropdownLocator: Locator
  private readonly daySelector: string
  private readonly monthSelector: string
  private readonly yearSelector: string
  private readonly publicLinkListSelector: string
  private readonly roleSelector: string
  private readonly folderSelector: string
  private publicLinkSelector: string

  constructor({ actor }: { actor: Actor }) {
    this.actor = actor
    this.publicLinkButtonLocator = this.actor.page.locator('#files-file-link-add')
    this.publicLinkPasswordLocator = this.actor.page.locator('#oc-files-file-link-password')
    this.publicLinkNameLocator = this.actor.page.locator('#oc-files-file-link-name')
    this.roleDropdownLocator = this.actor.page.locator('#files-file-link-role-button')
    this.expirationDateDropdownLocator = this.actor.page.locator('#files-links-expiration-btn')
    this.createLinkButtonLocator = this.actor.page.locator('#oc-files-file-link-create')
    this.publicLinkLocator = this.actor.page.locator(
      '//a[@class = "oc-files-file-link-url oc-text-truncate"]'
    )
    this.yearButtonLocator = this.actor.page.locator(
      `//div[@class = "vc-nav-container"]/div[@class="vc-nav-header"]//span[position()=2]`
    )
    this.nextSpanYearLocator = this.actor.page.locator(
      `//div[@class = "vc-nav-container"]/div[@class="vc-nav-header"]//span[position()=3]`
    )
    this.monthAndYearDropdownLocator = this.actor.page.locator(`//div[@class = 'vc-title']`)
    // for changing values of selector the below selectors are made string for passing value
    this.daySelector = `//span[@tabindex='-1' or @tabindex='0'][@aria-label='%s']`
    this.monthSelector = `//span[@data-id='%s.%s']`
    this.yearSelector = `//div[@class = "vc-nav-container"]/div[@class="vc-nav-items"]//span[contains(text(),'%s')]`
    this.publicLinkListSelector = `//ul[@class = 'oc-list oc-list-divider oc-overflow-hidden oc-m-rm']/li`
    this.roleSelector = `//span[@id="files-role-%s"]`
    this.folderSelector = `//*[@data-test-resource-name="%s"]/ancestor::tr//button[contains(@class, "files-quick-action-collaborators")]`
    this.publicLinkSelector = `//ul/li//h5[contains(text(),'%s')]/following-sibling::div/a`
  }

  async getLinksCount(): Promise<number> {
    await this.actor.page.waitForSelector(this.publicLinkListSelector)
    return await this.actor.page.locator(this.publicLinkListSelector).count()
  }

  async setRole(actor, role: string): Promise<void> {
    const { page } = this.actor
    await this.roleDropdownLocator.click()
    await this.actor.page.locator(util.format(this.roleSelector, role)).click()
  }

  async createPublicLinkForResource({
    resource,
    name,
    role,
    dateOfExpiration,
    password,
    via
  }: {
    resource: string
    name: string
    role: string
    dateOfExpiration: string
    password: string
    via: 'SIDEBAR_PANEL' | 'QUICK_ACTION'
  }): Promise<void> {
    const { page } = this.actor
    const resourcePaths = resource.split('/')
    const resourceName = resourcePaths.pop()
    if (resourcePaths.length) {
      await filesCta.navigateToFolder({ page: page, path: resourcePaths.join('/') })
    }

    switch (via) {
      case 'QUICK_ACTION':
        await page.locator(util.format(this.folderSelector, resourceName)).click()
        break

      case 'SIDEBAR_PANEL':
        await filesCta.sidebar.open({ page: page, resource: resourceName })
        await filesCta.sidebar.openPanel({ page: page, name: 'links' })
        break
    }
    await this.publicLinkButtonLocator.click()

    if (name) {
      await this.publicLinkNameLocator.fill(name)
    }

    if (role) {
      await this.setRole(this.actor, role)
    }

    if (dateOfExpiration) {
      const newExpiryDate = getActualExpiryDate(
        dateOfExpiration.toLowerCase().match(/[dayrmonthwek]+/)[0],
        dateOfExpiration
      )

      await page.locator('#oc-files-file-link-expire-date').evaluate(
        (datePicker: any, { newExpiryDate }): any => {
          datePicker.__vue__.updateValue(newExpiryDate)
        },
        { newExpiryDate }
      )
    }

    if (password) {
      await this.publicLinkPasswordLocator.fill(password)
    }

    await this.createLinkButtonLocator.click()

    const publicLinkUrl = await page
      .locator(util.format(this.publicLinkSelector, name))
      .textContent()
    PublicLink.setLastCreatedPublicLink(publicLinkUrl)
  }

  public static setLastCreatedPublicLink(publicLinkUrl: string): void {
    PublicLink.lastCreatedPublicLink = publicLinkUrl
  }

  public static getLastCreatedPublicLink(): string {
    return PublicLink.lastCreatedPublicLink
  }
}
