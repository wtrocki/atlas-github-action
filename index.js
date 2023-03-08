const core = require('@actions/core');
const atlas = require("wtr-cloud-api-client")
const createCluster = require("./src/create/createCluster");
const reuseCluster = require("./src/create/reuseCluster");

function createAPIConfig(core) {
  const url = process.env.MDB_BASE_URL || "https://cloud.mongodb.com";
  const apiUrl = new atlas.ServerConfiguration(url, {})
  const apiKey = process.env.MDB_API_KEY
  const apiSecret = process.env.MDB_API_SECRET

  if (!apiKey || !apiSecret) {
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
    if (!config) {
      return
    }
    const project = core.getInput('projectId') || process.env.PROJECTID;
    const name = core.getInput('name') || process.env.CLUSTER_NAME;
    const reuse = core.getInput('reuse') || process.env.REUSE;

    if (!name) {
      return core.setFailed(`Missing name parameter`)
    }

    if (!project) {
      return core.setFailed(`Missing project parameter`)
    }

    let connectionURL;
    if (reuse === "true") {
      connectionURL = reuseCluster(core, config, project, name);
    } else {
      connectionURL = createCluster(core, config, project, name);
    }
    if (!connectionURL) {
      return core.setFailed("Cannot obtain connection url. Please check logs above.")
    }
    core.setOutput('connectionURL', connectionURL);
  } catch (error) {
    core.info(error)
    core.setFailed(error.message);
  }
}

run();

