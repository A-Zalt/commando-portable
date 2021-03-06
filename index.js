let prefix = "!"
const util = require('util')
const fs = require('fs')
const portable = {
    admins: [],
    blocked: [],
    evalExport: false,
    categories: ["Info", "No category"],
    addAdmin: (id) => {
        if(typeof id !== "string" || id.length !== 18) throw new Error("Wrong Discord Snowflake")
        portable.admins.push(id)
    },
    remAdmin: (id) => {
        if(typeof id !== "string" || id.length !== 18) throw new Error("Wrong Discord Snowflake")
        let s = portable.admins
        portable.admins = []
        for(i of s) {
            if(i !== id) portable.admins.push(i)
        }
        return portable.admins
    },
    block: (id) => {
        if(typeof id !== "string" || id.length !== 18) throw new Error("Wrong Discord Snowflake")
        portable.blocked.push(id)
    },
    unblock: (id) => {
        if(typeof id !== "string" || id.length !== 18) throw new Error("Wrong Discord Snowflake")
        let s = portable.blocked
        portable.blocked = []
        for(i of s) {
            if(i !== id) portable.blocked.push(i)
        }
        return portable.blocked
    },
    prefix: prefix,
    userFilename: "prefixes",
    guildFilename: "guild-prefixes",
    prefixes: {enabledUser: false, enabledGuild: false},
    enableUserPrefixes: () => {
        portable.prefixes.enabledUser = true
        portable.prefixes.allUser = JSON.parse(fs.readFileSync(`${portable.userFilename}.json`))
    },
    enableGuildPrefixes: () => {
        portable.prefixes.enabledGuild = true
        portable.prefixes.allGuild = JSON.parse(fs.readFileSync(`${portable.guildFilename}.json`))
    },
    emulate: (content, channel) => {
        return portable.client.emit("message", {content: content, author: {id: 1, bot: false}, channel: channel})
    },
    paginator: async(channel, author, pages, timeout) => {
        let reactions = ["⬅️", "▶️", "◀️", "⏹️", "➡️"]
        let currentPage = 0
        let filter = (reaction, user) => reactions.includes(reaction.emoji.name) && user.id === author.id
        let message = await channel.send(pages[currentPage])
        await message.react("⬅️")
        await message.react("◀️")
        await message.react("⏹️")
        await message.react("▶️")
        await message.react("➡️")
        let collector = message.createReactionCollector(filter, {idle: timeout})
        collector.on('collect', r => {
            switch(r.emoji.name) {
                case "⬅️":
                    currentPage = 0
                    message.edit(pages[currentPage])
                    break
                case "▶️":
                    currentPage++
                    if(currentPage > pages.length-1) currentPage = 0
                    message.edit(pages[currentPage]) 
                    break
                case "◀️":
                    currentPage--
                    if(currentPage < 0) currentPage = pages.length-1
                    message.edit(pages[currentPage]) 
                    break
                case "⏹️":
                    collector.stop()
                    break
                case "➡️":
                    currentPage = pages.length-1
                    message.edit(pages[currentPage])
                    break
            }
        })
        collector.on('end', () => {
            message.delete()
        })
    },
    commands: {},
    adminMessage: "You must be the admin of the bot in order to execute this command.",
    errorMessage: "Caught an error!\nDo not worry, I have sent the error to my developer. Expect this error to be fixed in a short time.",
    nsfwMessage: "This command can only be executed in an NSFW channel!",
    cooldownMessage: "This command is on cooldown.",
    botNoPermMessage: "I don't have access to the following permissions: {PERMS}",
    userNoPermMessage: "You are missing the {PERMS} permissions.",
    changePrefix: (newprefix) => {
        prefix = newprefix
        portable.prefix = newprefix
    },
    setUserPrefix: (id, prefix) => {
        portable.prefixes.allUser[id] = prefix
        fs.writeFileSync(`${portable.userFilename}.json`, JSON.stringify(portable.prefixes.allUser))
    },
    resetUserPrefix: (id) => {
        delete portable.prefixes.allUser[id]
        fs.writeFileSync(`${portable.userFilename}.json`, JSON.stringify(portable.prefixes.allUser))
    },
    setGuildPrefix: (id, prefix) => {
        portable.prefixes.allGuild[id] = prefix
        fs.writeFileSync(`${portable.guildFilename}.json`, JSON.stringify(portable.prefixes.allGuild))
    },
    resetGuildPrefix: (id) => {
        delete portable.prefixes.allGuild[id]
        fs.writeFileSync(`${portable.guildFilename}.json`, JSON.stringify(portable.prefixes.allGuild))
    },
    exampleCommands: {
        help: {
            description: "Get help about commands and categories.",
            usage: `help`,
            admin: false,
            nsfw: false,
            category: "Info",
            execute: async (msg, args, author, client) => {
                if(!args[0]) {
                    let commands = []
                    for(i of Object.keys(portable.commands)) {
                        if(!portable.commands[i].hidden) {
                            if(portable.admins.includes(author.id)) commands.push(i)
                            else {
                                if(!portable.commands[i].admin) commands.push(i)
                            }
                        }
                    }
                    msg.channel.send(`===HELP===\nCategories: ${portable.categories.join(", ")}\nCommands: ${commands.join(", ")}`, {code: true})
                } else {
                    if(Object.keys(portable.commands).includes(args[0])) {
                        msg.channel.send(`===HELP===\nCommand: ${args[0]}\nDescription: ${portable.commands[args[0]].description}\nUsage: ${portable.commands[args[0]].usage}${portable.commands[args[0]].aliases ? `\nAliases: ${portable.commands[args[0]].aliases.join(", ")}` : ""}`, {code: true})
                    } else if(portable.categories.includes(args.join(" "))) {
                        let categoryCommands = []
                        for(i=0;i<Object.keys(portable.commands).length;i++) {
                            if(portable.commands[Object.keys(portable.commands)[i]].category === args.join(" ")) categoryCommands.push(Object.keys(portable.commands)[i])
                        }
                        msg.channel.send(`===HELP===\nCategory: ${args.join(" ")}\nCommands: ${categoryCommands.join(", ")}`, {code: true})
                    } else {
                        for(i of Object.keys(portable.commands)) {
                            if(portable.commands[i].aliases && portable.commands[i].aliases.includes(args[0])) return msg.channel.send(`===HELP===\nCommand: ${args[0]}\nDescription: ${portable.commands[i].description}\nUsage: ${portable.commands[i].usage.replace(i, args[0])}${portable.commands[i].aliases ? `\nAliases: ${portable.commands[i].aliases.join(", ").replace(args[0], i)}` : ""}`, {code: true})
                        }
                        msg.channel.send(`No category or command was found with this name.`)
                    }
                }
            }
        },
        ping: {
            description: "Ping the bot.",
            usage: `ping`,
            admin: false,
            nsfw: false,
            /* cooldown: {
                time: 10000,
                worksFor: {

                }
            }, */
            //Example of rate limit in 10s
            category: "Info",
            execute: async (msg, args, author, client) => {
                msg.channel.send(`:ping_pong: Pong!\nLatency: ${Math.round(client.ping)} ms`)
            }
        },
        eval: {
            description: "Evaluate JavaScript code.",
            usage: `eval <code>`,
            admin: true,
            nsfw: false,
            category: "Manager",
            execute: async(msg, args, author, client) => {
                let commands = portable.commands
                let bot = portable.client
                let message = msg
                let channel = msg.channel
                let instance = portable
                let _export = portable.evalExport
                msg.react("▶️").then(async _$ => {
                    try {
                        if(args.join(" ").startsWith("```js")) args = args.join(" ").split("").slice(5, args.join(" ").length-4).join("").split(" ")
                        let evaled = await eval(args.join(" "))
                        if(util.inspect(evaled, {depth: 0, maxArrayLength: 50}).length > 1992) {
                            console.log(util.inspect(evaled, {depth: 0, maxArrayLength: 50}))
                            msg.react('✅').then(msg.channel.send(`Output was too long. Check the console for output.`))
                        }
                    if(util.inspect(evaled, {depth: 0, maxArrayLength: 50}).length < 1) {
                        msg.react('‼')
                        return msg.channel.send(`DiscordAPIError: Cannot send an empty message`, {code: "js"}).catch(() => {})
                    }
                    msg.react("✅")
                    msg.channel.send(util.inspect(evaled, {depth: 0, maxArrayLength: 50}).replace(client.token, "[token omitted]").replace(util.inspect(Array.from(client.token), {depth: 0, maxArrayLength: 50}), "['[', 't', 'o', 'k', 'e', 'n', ' ', 'o', 'm', 'i', 't', 't', 'e', 'd', ']']"), {code: "js"})
                } catch (err) {
                    msg.react('‼')
                    msg.channel.send(err.stack, {code: "js"}).catch(() => {})
                }
            })
            }
        }
    },
    loadExamples: () => {
        for(i=0;i<Object.keys(portable.exampleCommands).length;i++) {
            portable.commands[Object.keys(portable.exampleCommands)[i]] = portable.exampleCommands[Object.keys(portable.exampleCommands)[i]]
        }
    },
    Command: (options) => {
        if(!options.name || !options.description || !options.usage || !options.execute) throw new Error("Not enough arguments provided")
        if(!portable.categories.includes(options.category ? options.category : "No category")) throw new Error("No such category, call categories to see available categories")
        portable.commands[options.name] = options
        return portable.commands[options.name]
    },
    handler: (client, options) => {
        /**
         * default options = {
         *  bots: false,
         *  dm: false
         * }
         */
            client.on('message', msg => {
                let command = msg.content
                .split(" ")
                .shift()
                .slice(
                    (!portable.prefixes.enabledUser 
                    ||
                    !portable.prefixes.allUser[msg.author.id])
                    ?
                        (!portable.prefixes.enabledGuild
                        ||
                        !portable.prefixes.allGuild[msg.guild.id])
                        ?
                        portable.prefix.length
                        :
                        portable.prefixes.allGuild[msg.guild.id].length
                    :
                    portables.prefixes.allUser[msg.author.id].length
                )
                if(!options) options = {bots: false, dm: false}
                if(msg.author.bot && !options.bots) return
                if(msg.channel.type === "dm" && !options.dm) return
                if(portable.blocked.includes(msg.author.id)) return
                if(Object.keys(portable.commands).includes(command) && msg.content.startsWith((!portable.prefixes.enabledUser || !portable.prefixes.allUser[msg.author.id]) ? (!portable.prefixes.enabledGuild || !portable.prefixes.allGuild[msg.guild.id]) ? portable.prefix : portable.prefixes.allGuild[msg.guild.id] : portable.prefixes.allUser[msg.author.id])) {
                    if(portable.commands[command] && portable.commands[command].admin && !portable.admins.includes(msg.author.id)) {
                        if(!portable.adminMessage || typeof portable.adminMessage !== "string") return
                        else return msg.channel.send(portable.adminMessage)
                    }
                    if(portable.commands[command] && portable.commands[command].nsfw && !msg.channel.nsfw) {
                        if(!portable.nsfwMessage || typeof portable.nsfwMessage !== "string") return
                        else return msg.channel.send(portable.nsfwMessage)
                    }
                    if(portable.commands[command] && portable.commands[command].cooldown && portable.commands[command].cooldown.worksFor[msg.author.id] === true && !portable.admins.includes(msg.author.id)) {
                        return msg.channel.send(portable.сooldownMessage).catch(() => {msg.channel.send("You are on cooldown!")})
                    }
                    if(portable.commands[command] && portable.commands[command].permissions && msg.channel.type !== "dm" && !msg.member.permissions.has(portable.commands[command].permissions, true)) {
                        return msg.channel.send(portable.userNoPermMessage.replace(/\{PERMS\}/g, portable.commands[command].permissions.join(", "))).catch(() => {msg.channel.send("You don't have enough permissions!")})
                    }
                    if(portable.commands[command] && portable.commands[command].permissions && msg.channel.type !== "dm" && !msg.guild.me.permissions.has(portable.commands[command].permissions, true)) {
                        return msg.channel.send(portable.botNoPermMessage.replace(/\{PERMS\}/g, portable.commands[command].permissions.join(", "))).catch(() => {msg.channel.send("I don't have enough permissions!")})
                    }
                    try {
                        portable.commands[command].execute(msg, msg.content.split(" ").slice(1), msg.author, client)
                        if(portable.commands[command].cooldown) {
                            portable.commands[command].cooldown.worksFor[msg.author.id] = true
                            setTimeout(() => {portable.commands[command].cooldown.worksFor[msg.author.id] = false}, portable.commands[command].cooldown.time)
                        }
                    } catch(error) {
                        if(!portable.errorMessage) msg.channel.send("[PLACEHOLDER] Caught an error")
                        msg.channel.send(portable.errorMessage)
                        console.log(error)
                        for(i of portable.admins) {
                            client.users.get(i).send(error, {code: "js"})
                        }
                    }
                } else {
                    if(msg.content.startsWith((!portable.prefixes.enabledUser || !portable.prefixes.allUser[msg.author.id]) ? (!portable.prefixes.enabledGuild || !portable.prefixes.allGuild[msg.guild.id]) ? portable.prefix : portable.prefixes.allGuild[msg.guild.id] : portable.prefixes.allUser[msg.author.id])) {
                        for(i of Object.keys(portable.commands)) {
                            if(portable.commands[i] && portable.commands[i].aliases && portable.commands[i].aliases.includes(command)) {
                                if(portable.commands[i] && portable.commands[i].admin && !portable.admins.includes(msg.author.id)) {
                                    if(!portable.adminMessage || typeof portable.adminMessage !== "string") return
                                    else return msg.channel.send(portable.adminMessage)
                                }
                                if(portable.commands[i] && portable.commands[i].nsfw && !msg.channel.nsfw) {
                                    if(!portable.nsfwMessage || typeof portable.nsfwMessage !== "string") return
                                    else return msg.channel.send(portable.nsfwMessage)
                                }
                                if(portable.commands[i] && portable.commands[i].cooldown && portable.commands[i].cooldown.worksFor[msg.author.id] === true && !portable.admins.includes(msg.author.id)) {
                                    return msg.channel.send(portable.сooldownMessage).catch(() => {msg.channel.send("You are on cooldown!")})
                                }
                                if(portable.commands[i] && portable.commands[i].permissions && msg.channel.type !== "dm" && !msg.member.permissions.has(portable.commands[i].permissions, true)) {
                                    return msg.channel.send(portable.userNoPermMessage.replace(/\{PERMS\}/g, portable.commands[i].permissions.join(", "))).catch(() => {msg.channel.send("You don't have enough permissions!")})
                                }
                                if(portable.commands[i] && portable.commands[i].permissions && msg.channel.type !== "dm" && !msg.guild.me.permissions.has(portable.commands[i].permissions, true)) {
                                    return msg.channel.send(portable.botNoPermMessage.replace(/\{PERMS\}/g, portable.commands[i].permissions.join(", "))).catch(() => {msg.channel.send("I don't have enough permissions!")})
                                }
                                try {
                                    portable.commands[i].execute(msg, msg.content.split(" ").slice(1), msg.author, client)
                                    if(portable.commands[i].cooldown) {
                                        portable.commands[i].cooldown.worksFor[msg.author.id] = true
                                        setTimeout(() => {portable.commands[i].cooldown.worksFor[msg.author.id] = false}, portable.commands[i].cooldown.time)
                                    }
                                } catch(error) {
                                    if(!portable.errorMessage) msg.channel.send("[PLACEHOLDER] Caught an error")
                                    msg.channel.send(portable.errorMessage)
                                    console.log(error)
                                    for(i of portable.admins) {
                                        client.users.get(i).send(error, {code: "js"})
                                    }
                                }
                            }
                        }
                    }
                }
            })
    },
    handleredit: (client, options) => {
        client.on("messageUpdate", (_old, msg) => {
            let command = msg.content
                .split(" ")
                .shift()
                .slice(
                    (!portable.prefixes.enabledUser 
                    ||
                    !portable.prefixes.allUser[msg.author.id])
                    ?
                        (!portable.prefixes.enabledGuild
                        ||
                        !portable.prefixes.allGuild[msg.guild.id])
                        ?
                        portable.prefix.length
                        :
                        portable.prefixes.allGuild[msg.guild.id].length
                    :
                    portables.prefixes.allUser[msg.author.id].length
                )
            if(!options) options = {bots: false, dm: false}
            if(msg.author.bot && !options.bots) return
            if(msg.channel.type === "dm" && !options.dm) return
            if(portable.blocked.includes(msg.author.id)) return
            if(Object.keys(portable.commands).includes(command) && msg.content.startsWith((!portable.prefixes.enabledUser || !portable.prefixes.allUser[msg.author.id]) ? (!portable.prefixes.enabledGuild || !portable.prefixes.allGuild[msg.guild.id]) ? portable.prefix : portable.prefixes.allGuild[msg.guild.id] : portable.prefixes.allUser[msg.author.id])) {
                if(portable.commands[command] && portable.commands[command].admin && !portable.admins.includes(msg.author.id)) {
                    if(!portable.adminMessage || typeof portable.adminMessage !== "string") return
                    else return msg.channel.send(portable.adminMessage)
                }
                if(portable.commands[command] && portable.commands[command].nsfw && !msg.channel.nsfw) {
                    if(!portable.nsfwMessage || typeof portable.nsfwMessage !== "string") return
                    else return msg.channel.send(portable.nsfwMessage)
                }
                if(portable.commands[command] && portable.commands[command].cooldown && portable.commands[command].cooldown.worksFor[msg.author.id] === true && !portable.admins.includes(msg.author.id)) {
                    return msg.channel.send(portable.сooldownMessage).catch(() => {msg.channel.send("You are on cooldown!")})
                }
                if(portable.commands[command] && portable.commands[command].permissions && msg.channel.type !== "dm" && !msg.member.permissions.has(portable.commands[command].permissions, true)) {
                    return msg.channel.send(portable.userNoPermMessage.replace(/\{PERMS\}/g, portable.commands[command].permissions.join(", "))).catch(() => {msg.channel.send("You don't have enough permissions!")})
                }
                if(portable.commands[command] && portable.commands[command].permissions && msg.channel.type !== "dm" && !msg.guild.me.permissions.has(portable.commands[command].permissions, true)) {
                    return msg.channel.send(portable.botNoPermMessage.replace(/\{PERMS\}/g, portable.commands[command].permissions.join(", "))).catch(() => {msg.channel.send("I don't have enough permissions!")})
                }
                try {
                    portable.commands[command].execute(msg, msg.content.split(" ").slice(1), msg.author, client)
                    if(portable.commands[command].cooldown) {
                        portable.commands[command].cooldown.worksFor[msg.author.id] = true
                        setTimeout(() => {portable.commands[command].cooldown.worksFor[msg.author.id] = false}, portable.commands[command].cooldown.time)
                    }
                } catch(error) {
                    if(!portable.errorMessage) msg.channel.send("[PLACEHOLDER] Caught an error")
                    msg.channel.send(portable.errorMessage)
                    console.log(error)
                    for(i of portable.admins) {
                        client.users.get(i).send(error, {code: "js"})
                    }
                }
            } else {
                if(msg.content.startsWith((!portable.prefixes.enabledUser || !portable.prefixes.allUser[msg.author.id]) ? (!portable.prefixes.enabledGuild || !portable.prefixes.allGuild[msg.guild.id]) ? portable.prefix : portable.prefixes.allGuild[msg.guild.id] : portable.prefixes.allUser[msg.author.id])) {
                    for(i of Object.keys(portable.commands)) {
                        if(portable.commands[i] && portable.commands[i].aliases && portable.commands[i].aliases.includes(command)) {
                            if(portable.commands[i] && portable.commands[i].admin && !portable.admins.includes(msg.author.id)) {
                                if(!portable.adminMessage || typeof portable.adminMessage !== "string") return
                                else return msg.channel.send(portable.adminMessage)
                            }
                            if(portable.commands[i] && portable.commands[i].nsfw && !msg.channel.nsfw) {
                                if(!portable.nsfwMessage || typeof portable.nsfwMessage !== "string") return
                                else return msg.channel.send(portable.nsfwMessage)
                            }
                            if(portable.commands[i] && portable.commands[i].cooldown && portable.commands[i].cooldown.worksFor[msg.author.id] === true && !portable.admins.includes(msg.author.id)) {
                                return msg.channel.send(portable.сooldownMessage).catch(() => {msg.channel.send("You are on cooldown!")})
                            }
                            if(portable.commands[i] && portable.commands[i].permissions && msg.channel.type !== "dm" && !msg.member.permissions.has(portable.commands[i].permissions, true)) {
                                return msg.channel.send(portable.userNoPermMessage.replace(/\{PERMS\}/g, portable.commands[i].permissions.join(", "))).catch(() => {msg.channel.send("You don't have enough permissions!")})
                            }
                            if(portable.commands[i] && portable.commands[i].permissions && msg.channel.type !== "dm" && !msg.guild.me.permissions.has(portable.commands[i].permissions, true)) {
                                return msg.channel.send(portable.botNoPermMessage.replace(/\{PERMS\}/g, portable.commands[i].permissions.join(", "))).catch(() => {msg.channel.send("I don't have enough permissions!")})
                            }
                            try {
                                portable.commands[i].execute(msg, msg.content.split(" ").slice(1), msg.author, client)
                                if(portable.commands[i].cooldown) {
                                    portable.commands[i].cooldown.worksFor[msg.author.id] = true
                                    setTimeout(() => {portable.commands[i].cooldown.worksFor[msg.author.id] = false}, portable.commands[i].cooldown.time)
                                }
                            } catch(error) {
                                if(!portable.errorMessage) msg.channel.send("[PLACEHOLDER] Caught an error")
                                msg.channel.send(portable.errorMessage)
                                console.log(error)
                                for(i of portable.admins) {
                                    client.users.get(i).send(error, {code: "js"})
                                }
                            }
                        }
                    }
                }
            }
        })
    }
}
module.exports = portable
