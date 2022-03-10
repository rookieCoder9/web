import { Given, DataTable } from '@cucumber/cucumber'
import { World } from '../environment'
import { config } from '../../config'
import { api } from '../../support'

Given(
  'the following users have been created',
  async function (this: World, stepUsers: DataTable): Promise<void> {
    const users = stepUsers.raw().map((u) => this.usersEnvironment.getUser({ id: u[0] }))
    const admin = this.usersEnvironment.getUser({ id: 'admin' })

    for (const user of users) {
      await api.user.deleteUser({ user, admin })
      await api.user.createUser({ user, admin })
    }
  }
)

Given(
  'the default folder for received shares has been set to {string}',
  async function (this: World, value: string): Promise<void> {
    const user = this.usersEnvironment.getUser({ id: 'admin' })

    if (!config.ocis) {
      await api.config.setShareFolder({ value, user })
    }
  }
)

Given(
  /^auto-accept shares has been (disabled|enabled)$/,
  async function (this: World, actionType: string): Promise<void> {
    if (config.ocis) {
      return
    }

    const user = this.usersEnvironment.getUser({ id: 'admin' })

    await api.config.disableShareAutoAccept({
      user,
      action: actionType === 'disabled' ? 'disable' : 'enable'
    })
  }
)
