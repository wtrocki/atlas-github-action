const atlas = require("wtr-cloud-api-client")
const waitFor = require("../wait")

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
    try{
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
    }catch(err){
        if(JSON.parse(err.body).errorCode === "USER_ALREADY_EXISTS"){
            core.info(`User ${dbUser} already exist. Skipping creation`)
        }else{
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

    core.info(`Created access rules for ip range:  ${accessRule.results.map((obj)=>{
        return obj.cidrBlock
    })}`)
    
    // const clustersApi = new atlas.MultiCloudClustersApi(config);
    // core.info(`Creating cluster for project: ${project}`);
    // await clustersApi.createCluster(project, {
    //     name: name,
    //     clusterType: "REPLICASET",
    //     replicationSpecs: [{
    //         numShards: 1,
    //         zoneName: "Zone 1",
    //         regionConfigs: [
    //             {
    //                 providerName: "TENANT",
    //                 backingProviderName: "AWS",
    //                 regionName: "us-east-1",
    //                 priority: 7,
    //                 electableSpecs: [{
    //                     instanceSize: "M0",
    //                     NodeCount: 0
    //                 }],
    //             }
    //         ],
    //     }]
    // });

    // let url = "";
    // // TODO this should be configurable?
    // let tries = 10;
    // while (url === "" || tries > 0) {
    //     await waitFor(10000)
    //     core.info("Trying to fetch cluster connection url. Attempts left:" + tries)
    //     tries = tries - 1;
    //     const cluster = await clustersApi.getCluster(project, name);
    //     if (cluster.connectionStrings.standardSrv) {
    //         return cluster.connectionStrings.standardSrv;
    //     }
    // }
    // throw new Error("Cannot fetch api url in the last 50 seconds.")
}


