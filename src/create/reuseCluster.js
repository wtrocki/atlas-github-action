
const atlas = require("wtr-cloud-api-client")

module.exports = async function reuseCluster(core, config, project, name){
    const api = new atlas.MultiCloudClustersApi(config);
    core.info(`Fetching current cluster based on project and name`)
    const cluster = await api.getCluster(project, name)
    if(!cluster){
      throw new Error(`Cannot find cluster: ${name}`);
    }
    return cluster.connectionStrings.standardSrv
}
