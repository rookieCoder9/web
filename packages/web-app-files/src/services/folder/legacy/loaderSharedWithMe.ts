import { FolderLoader, FolderLoaderTask, TaskContext } from '../../folder'
import Router from 'vue-router'
import { useTask } from 'vue-concurrency'
import { aggregateResourceShares } from '../../../helpers/resources'
import { isLocationSharesActive } from '../../../router'
import get from 'lodash-es/get'
import { Store } from 'vuex'

export class FolderLoaderLegacySharedWithMe implements FolderLoader {
  public isEnabled(store: Store<any>): boolean {
    return !get(store, 'getters.capabilities.spaces', false)
  }

  public isActive(router: Router): boolean {
    return isLocationSharesActive(router, 'files-shares-with-me')
  }

  public getTask(context: TaskContext): FolderLoaderTask {
    const { store, clientService } = context

    return useTask(function* (signal1, signal2, path) {
      store.commit('Files/CLEAR_CURRENT_FILES_LIST')

      let resources = yield clientService.owncloudSdk.requests.ocs({
        service: 'apps/files_sharing',
        action: '/api/v1/shares?format=json&shared_with_me=true&state=all&include_tags=false',
        method: 'GET'
      })
      resources = yield resources.json()
      resources = resources.ocs.data

      if (resources.length) {
        const isOcis = store.getters.isOcis
        const configuration = store.getters.configuration
        const getToken = store.getters.getToken

        resources = aggregateResourceShares(
          resources,
          true,
          !isOcis,
          configuration.server,
          getToken
        )
      }

      store.commit('Files/LOAD_FILES', {
        currentFolder: null,
        files: resources
      })
    })
  }
}
