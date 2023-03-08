const atlas = require("wtr-cloud-api-client")
const waitFor = require("../wait")
const reuseCluster = require("./reuseCluster")

module.exports = async function createCluster(core, config, project, name) {
    const dbUser = process.env.MONGODB_USER
    const dbPass = process.env.MONGODB_PASSWORD

    if (!dbUser) {
        throw new Error("Missing MONGODB_USER env var")
    }

    if (!dbPass) {
        throw new Error("Missing MONGODB_PASSWORD env var")
    }


    const usersApi = new atlas.DatabaseUsersApi(config);
    try {
        const user = await usersApi.createDatabaseUser(project, {
            username: dbUser,
            password: dbPass,
            databaseName: "admin",
            roles: [
                {
                    collectionName: undefined,
                    databaseName: "admin",
                    roleName: "readWriteAnyDatabase"
                }
            ]
        })
        core.info("Created user: " + user.username)
    } catch (err) {
        if (err && err.body && JSON.parse(err.body).errorCode === "USER_ALREADY_EXISTS") {
            core.info(`User ${dbUser} already exist. Skipping creation`)
        } else {
            throw new Error("User creation failure: " + JSON.stringify(err))
        }
    }


    const accessApi = new atlas.ProjectIPAccessListApi(config);
    const accessRule = await accessApi.createProjectIpAccessList(project, [
        {
            // TODO enable setup for differnet IP ranges
            ipAddress: "0.0.0.0",
            comment: "Github Actions"
        }
    ]);

    core.info(`Created access rules for ip range:  ${accessRule.results.map((obj) => {
        return obj.cidrBlock
    })}`)

    const clustersApi = new atlas.MultiCloudClustersApi(config);

    try {
        let conUrl = await reuseCluster(core, config, project, name)
        if (conUrl) {
            return conUrl;
        }
        throw new Error(`Created cluster already exist but it haven't been started yet. Please rerun job again.`)
    } catch (err) {
        core.info(`Cannot find existing cluster`)
        // Ignore - we need to create cluster
    }

    core.info(`Creating cluster for project: ${project}`);
    try{
        await clustersApi.createCluster(project, {
            name: name,
            clusterType: "REPLICASET",
            replicationSpecs: [{
                numShards: 1,
                zoneName: "Zone 1",
                regionConfigs: [
                    {
                        providerName: "TENANT",
                        backingProviderName: "AWS",
                        regionName: "US_EAST_1",
                        priority: 7,
                        readOnlySpecs:{
                            instanceSize: "M0",
                            NodeCount: 0
                        },
                        electableSpecs: {
                            instanceSize: "M0"
                        },
                    }
                ],
            }]
        });
    
    }catch(err){
        if (err && err.body && 
            err.body.errorCode === "CANNOT_CREATE_FREE_CLUSTER_VIA_PUBLIC_API") {
                return core.info(" This project already has another free cluster. Please remove it first. ")
        }
        throw err;
    }
   
    let url = "";
    // TODO this should be configurable?
    let tries = 10;
    while (url === "" || tries > 0) {
        await waitFor(10000)
        core.info("Trying to fetch cluster connection url. Attempts left:" + tries)
        tries = tries - 1;
        const cluster = await clustersApi.getCluster(project, name);
        if (cluster.connectionStrings.standardSrv) {
            return cluster.connectionStrings.standardSrv;
        }
    }
    throw new Error("Cannot fetch api url. Timeout!")
}


