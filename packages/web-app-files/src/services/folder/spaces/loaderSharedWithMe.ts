import { FolderLoader, FolderLoaderTask, TaskContext } from '../../folder'
import Router from 'vue-router'
import { useTask } from 'vue-concurrency'
import { buildResource, buildWebDavSpacesPath } from '../../../helpers/resources'
import { isLocationSharesActive } from '../../../router'
import get from 'lodash-es/get'
import { Store } from 'vuex'

const SHARE_JAIL_ID = 'a0ca6a90-a365-4782-871e-d44447bbc668'

export class FolderLoaderSpacesSharedWithMe implements FolderLoader {
  public isEnabled(store: Store<any>): boolean {
    return get(store, 'getters.capabilities.spaces', false)
  }

  public isActive(router: Router): boolean {
    return isLocationSharesActive(router, 'files-shares-with-me')
  }

  public getTask(context: TaskContext): FolderLoaderTask {
    const { store, clientService } = context

    const graphClient = clientService.graphAuthenticated(
      store.getters.configuration.server,
      store.getters.getToken
    )

    return useTask(function* (signal1, signal2, path) {
      store.commit('Files/CLEAR_CURRENT_FILES_LIST')

      const drive = yield graphClient.drives.getDrive(SHARE_JAIL_ID)
      if (!drive.data) {
        return
      }
      // TODO: would be nice to use `drive.data.root.webDavUrl` to supported federated storages
      const webDavResponse = yield clientService.owncloudSdk.files.list(
        buildWebDavSpacesPath(drive.data.id, path || '')
      )
      const resources = webDavResponse.map(buildResource)
      // FIXME: resources are not recognized as shares. need to augment some data...
      console.log(resources)

      store.commit('Files/LOAD_FILES', {
        currentFolder: null,
        files: resources
      })
    })
  }
}
