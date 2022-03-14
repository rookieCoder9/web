import { FolderLoader, FolderLoaderTask, TaskContext } from '../folder'
import Router from 'vue-router'
import { useTask } from 'vue-concurrency'
import { aggregateResourceShares } from '../../helpers/resources'
import { isLocationSharesActive } from '../../router'

export class FolderLoaderSharedWithMe implements FolderLoader {
  public isActive(router: Router): boolean {
    return isLocationSharesActive(router, 'files-shares-with-me')
  }

  public getTask(context: TaskContext): FolderLoaderTask {
    const {
      store,
      clientService: { owncloudSdk: client }
    } = context

    return useTask(function* (signal1, signal2) {
      store.commit('Files/CLEAR_CURRENT_FILES_LIST')

      let resources = yield client.requests.ocs({
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
