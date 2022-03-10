import { Given, When } from '@cucumber/cucumber'
import { World } from '../environment'
import { config } from '../../config'
import { LoginPage, RuntimePage } from '../../support'
import { DateTime } from 'luxon'
import { kebabCase } from 'lodash'

async function LogInUser(this: World, stepUser: string): Promise<void> {
  const user = this.usersEnvironment.getUser({ id: stepUser })
  const actor = await this.actorsEnvironment.createActor({
    id: stepUser,
    namespace: kebabCase(
      [this.feature.name, stepUser, DateTime.now().toFormat('yyyy-M-d-hh-mm-ss')].join('-')
    )
  })
  const loginPage = new LoginPage({ actor })

  await actor.page.goto(config.frontendUrl)
  await loginPage.login({ user })
}

Given('{string} has logged in', LogInUser)

When('{string} logs in', LogInUser)

async function LogOutUser(this: World, stepUser: string): Promise<void> {
  const actor = await this.actorsEnvironment.getActor({ id: stepUser })
  const runtimePage = new RuntimePage({ actor })
  await runtimePage.logout()
  await actor.close()
}

Given('{string} has logged out', LogOutUser)

When('{string} logs out', LogOutUser)
