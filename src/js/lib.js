const {
  rmSync, rmdirSync, unlink
} = require('fs');
const fs = require('fs-extra')
const {
  Resolver,
  NpmHttpRegistry
} = require('./resolver/index.js')
const kleur = require('kleur');
const zlib = require('zlib');
const path = require('path');
const tar = require('tar');
const logger = require('../shared/logger')

logger.warn("This script's entry point is very buggy, meaning it may not output any data.")
logger.status("Contributions to fix appreciated.")


const deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
      fs.readdirSync(path).forEach(function(file) {
        const curPath = path + "/" + file;
          if(fs.lstatSync(curPath).isDirectory()) { // recurse
              deleteFolderRecursive(curPath);
          } else { // delete file
              fs.unlinkSync(curPath);
          }
      });
      fs.rmdirSync(path);
    }
};


function resolve(dependencies) {
  // const resolver = new Resolver(); // For server-side usage, uses https://registry.npmjs.org which doesn't have CORS enabled
  const res = dependencies
  const resolver = new Resolver({
    registry: new NpmHttpRegistry({
      registryUrl: 'https://registry.yarnpkg.com/'
    })
  });

  return resolver.resolve(res);
}

async function get() {

  let pkgjson = JSON.parse(fs.readFileSync('./package.json'))
  let pkgs = {}

  for (x in pkgjson["dependencies"]) {
    pkgs[x] = pkgjson["dependencies"][x]
  }

  resolve(pkgs)
    .then(console.log())
    .then(results => fs.writeFile('flight.lock', `${JSON.stringify(results, null, "\t")}`, function (err) {
      if (err === null) {
        console.log(kleur.bold().green("Lockfile successfully created."))
        const lockfile = fs.readFileSync('./flight.lock')
        const parsed = JSON.parse(lockfile)
        const json = parsed.appDependencies

        try {
          fs.mkdirSync('.flight')
        } catch (e) {
          fs.emptyDirSync('.flight')
          fs.rmdirSync('.flight')
          fs.mkdirSync('.flight')
        }

        for (let x in json) {
          const name = x
          const version = json[x].version
          const urlformat = `https://registry.yarnpkg.com/${name}/-/${name}-${version}.tgz`
          logger.download(name, version)
          const {
            default: {
              stream
            }
          } = require("got");
          const {
            createWriteStream
          } = require("fs");
          const {
            execSync
          } = require("child_process");
          const existsSync = function (path) {
            return new Promise(function (resolve, reject) {
              fs.access(path, fs.F_OK, function (err) {
                return resolve(err ? false : true)
              })
            })
          }

          const existsAsync = async function (path) {
            const exists = await existsSync(path)
          }

          const start = () => {
            const download = stream(urlformat).pipe(createWriteStream(`./.flight/${name}-${version}.tgz`));
            download.on("finish", () => {
              console.log(kleur.bold().green("Downloaded: ") + " " + name + " @ " + version + ".")
              const find = existsAsync('node_modules')

              if (find == true) {
                execSync(`cd .flight ; tar zxvf ${name}-${version}.tgz -C ../node_modules`, {
                  stdio: "inherit"
                });
              }

              if (find == false) {
                execSync(`mkdir node_modules ; cd .flight ; tar zxvf ${name}-${version}.tgz -C ../node_modules`, {
                  stdio: "inherit"
                });
              }

              if(!fs.existsSync(`./node_modules/${name}/`)){
                fs.mkdirSync(`./node_modules/${name}/`, {
                  recursive: true
                })
              }

              fs.createReadStream(path.resolve(`./.flight/${name}-${version}.tgz`))
                .pipe(zlib.Unzip())
                .pipe(tar.extract({
                  C: `./node_modules/${name}/`,
                  strip: 1
                }))
                .on("finish", () => {
                  rmSync(`./.flight/${name}-${version}.tgz`)
                  console.log(kleur.bold().magenta("Unzipped:    ") + " " + name + " @ " + version + ".")
                })



            });
          };



          start();
        }

        const json2 = parsed.resDependencies

        for (let x in json2) {
          const raw = x
          if (raw.startsWith("@") == false) {
            const split = raw.split('@')
            const name = split[0]
            const version = split[1]
            const urlformat = `https://registry.yarnpkg.com/${name}/-/${name}-${version}.tgz`
            console.log(kleur.bold().blue("Downloading:") + " " + name + " @ " + version + ".");
            const {
              default: {
                stream
              }
            } = require("got");
            const {
              createWriteStream
            } = require("fs");
            const {
              execSync
            } = require("child_process");
            const existsSync = function (path) {
              return new Promise(function (resolve, reject) {
                fs.access(path, fs.F_OK, function (err) {
                  return resolve(err ? false : true)
                })
              })
            }

            const existsAsync = async function (path) {
              const exists = await existsSync(path)
            }

            const start = () => {
              const download = stream(urlformat).pipe(createWriteStream(`./.flight/${name}-${version}.tgz`));
              download.on("finish", () => {
                console.log(kleur.bold().green("Downloaded: ") + " " + name + " @ " + version + ".")
                const find = existsAsync('node_modules')

                if (find == true) {
                  execSync(`cd .flight ; tar zxvf ${name}-${version}.tgz -C ../node_modules`, {
                    stdio: "inherit"
                  });
                }

                if (find == false) {
                  execSync(`mkdir node_modules ; cd .flight ; tar zxvf ${name}-${version}.tgz -C ../node_modules`, {
                    stdio: "inherit"
                  });
                }

                if(!fs.existsSync(`./node_modules/${name}/`)){
                  fs.mkdirSync(`./node_modules/${name}/`, {
                    recursive: true
                  })
                }

                fs.createReadStream(path.resolve(`./.flight/${name}-${version}.tgz`))
                  .pipe(zlib.Unzip())
                  .pipe(tar.extract({
                    C: `./node_modules/${name}/`,
                    strip: 1
                  }))
                  .on("finish", () => {
                    rmSync(`./.flight/${name}-${version}.tgz`)
                    console.log(kleur.bold().magenta("Unzipped:    ") + " " + name + " @ " + version + ".")
                  })



              });
            };



            start();
        }
        // below org scope code is still pretty buggy (try fixing this if you can, the syntax for resDeps with org scope is @org/pkg)
        if (raw.startsWith("@") == true) {
          const split = raw.split('/')
          const scope = split[0]
          console.log(scope)
          const pkg = split[1]
          const version = pkg.split('@')[1]
          const name = pkg.split('@')[0]
          console.log(version)
          const urlformat = `https://registry.yarnpkg.com/${scope}/${name}/-/${name}-${version}.tgz`
          console.log(kleur.bold().blue("Downloading:") + " " + name + " @ " + version + ".");
          const {
            default: {
              stream
            }
          } = require("got");
          const {
            createWriteStream
          } = require("fs");
          const {
            execSync
          } = require("child_process");
          const existsSync = function (path) {
            return new Promise(function (resolve, reject) {
              fs.access(path, fs.F_OK, function (err) {
                return resolve(err ? false : true)
              })
            })
          }

          const existsAsync = async function (path) {
            const exists = await existsSync(path)
          }

          const start = () => {
            const download = stream(urlformat).pipe(createWriteStream(`./.flight/${name}-${version}.tgz`));
            download.on("finish", () => {
              console.log(kleur.bold().green("Downloaded: ") + " " + name + " @ " + version + ".")
              const find = existsAsync('node_modules')

              if (find == true) {
                execSync(`cd .flight ; tar zxvf ${name}-${version}.tgz -C ../node_modules`, {
                  stdio: "inherit"
                });
              }

              if (find == false) {
                execSync(`mkdir node_modules ; cd .flight ; tar zxvf ${name}-${version}.tgz -C ../node_modules`, {
                  stdio: "inherit"
                });
              }

              if(!fs.existsSync(`./node_modules/${name}/`)){
                fs.mkdirSync(`./node_modules/${name}/`, {
                  recursive: true
                })
              }

              fs.createReadStream(path.resolve(`./.flight/${name}-${version}.tgz`))
                .pipe(zlib.Unzip())
                .pipe(tar.extract({
                  C: `./node_modules/${name}/`,
                  strip: 1
                }))
                .on("finish", () => {
                  rmSync(`./.flight/${name}-${version}.tgz`)
                  console.log(kleur.bold().magenta("Unzipped:    ") + " " + name + " @ " + version + ".")
                })



            });
          };



          start();
      }        
      }


      } else {
        console.log(err)
      }
    }))
}

function uninstall(name) {
  let pkgjson = JSON.parse(fs.readFileSync('./package.json'))
  let pkgs = {}
  let pkgname = args[1]
  if (typeof args[1] !== 'undefined') {
    for (x in pkgjson["dependencies"]) {
      pkgs[x] = pkgjson["dependencies"][x]
    }

    if (typeof pkgs[pkgname] !== 'undefined') {
      try {
        deleteFolderRecursive(path.resolve(`./.flight/${pkgname}/`))
        deleteFolderRecursive(path.resolve(`./node_modules/${pkgname}/`))
        console.log(kleur.bold().red("Uninstalled ") + pkgname + " from the packages directory.")
      } catch (e) {
        console.log(kleur.bold().red("Error: ") + pkgname + kleur.bold().red(" is not present in the  packages directory."))
      }

      delete pkgs[pkgname]
      pkgjson["dependencies"] = pkgs
      fs.writeJSONSync('./package.json', pkgjson, {
        spaces: 4,
        encoding: 'utf8',
      })
      console.log(kleur.bold().red("Removed ") + pkgname + " from packages.json.")
     } else {
      console.log(kleur.bold().red('Package ') + pkgname + kleur.bold().red(' not found in package.json.'))
    }
  }else{
    console.log(kleur.bold().red("Please specify a package to uninstall."))
  }
}

module.exports = {
  deleteFolderRecursive,
  resolve,
  get,
  uninstall,
  resolve

}