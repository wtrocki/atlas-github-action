const core = require('@actions/core');
const atlas = require("wtr-cloud-api-client")

function createAPIConfig(core){
    const apiUrl = new atlas.ServerConfiguration<{  }>(process.env.MDB_BASE_URL || "https://cloud.mongodb.com", {  }) 
    const apiKey = process.env.MDB_API_KEY
    const apiSecret = process.env.MDB_API_SECRET

    if (!apiKey || !apiSecret){
        core.setFailed(`Missing MDB_API_KEY and MDB_API_SECRET env vars`)
        return;
    }
    
    const configurationParameters = {
      httpApi: new atlas.DigestFetchHttpLibrary(apiKey, apiSecret), // Can also be ignored - default is usually fine
      baseServer: apiUrl,
    }

    return atlas.createConfiguration(configurationParameters);  
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    const config = createAPIConfig(core)
    if(!config){
        return
    }
    const api = new atlas.MultiCloudClustersApi(config);
    const project = core.getInput('projectId');
    const name = core.getInput('name');
    const dryRun = core.getInput('dryrun');

    if (!name){
        return core.setFailed(`Missing name parameter`)
    }

    if (!project){
        return core.setFailed(`Missing project parameter`)
    }
    
    core.info(`Creating cluster for project: ${project}.`);
    if(dryRun == "true"){
      const clusters = await api.listClusters(project)
      if(clusters.totalCount === 0){
        return core.setFailed("Dry run finished. No active cluster is present");
      }
      core.setOutput('connectionURL', clusters.results[0].connectionStrings.standard);
    }else{
      // api.createCluster(project,{})
      core.setOutput('connectionURL', "TODO");
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
