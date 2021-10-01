import { checkResponseStatus, request } from './http'
import { User } from '../types'
import { URLSearchParams } from 'url'

export const setRecevedFolder = async ({
  folder,
  admin
}: {
  folder: string
  admin: User
}): Promise<void> => {
  const body = new URLSearchParams()
  body.append('command', `config:system:set share_folder --value=${folder}`)
  console.log(body)

  const response = await request({
    method: 'POST',
    path: 'apps/testing/api/v1/occ',
    body: body,
    user: admin,
    versionApi: 'v1.php'
  })
  console.log(response)
  checkResponseStatus(response, 'Failed creating receved folder')
}
