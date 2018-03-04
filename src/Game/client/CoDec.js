// // This class contains information about the expected structure of the different objects that can be transmitted
// // between the client and the server, in order to guide the encoding/decoding process
// export default class CoDec {
//     constructor() {
//         this.bytesPerChar = 1; // How many bytes to encode a character of a string
//         this.bytesPerID = 2; // How many bytes to encode numerical id's (a maximum id of 2^16 = 65536 seems reasonable for a small game, "real" games should use at least 3 bytes)
//         this.booleanBytes = 1; // How many bytes to use to represent booleans (= 8 booleans per byte allocated),
//         this.stampBytes = 4; // How many bytes to encode timestamp (a timestamp takes more room than 4 bytes, but only the last 4 bytes are relevant, since the time spans incoded in the remaining ones are too big to be useful)
//     };
// }

// CoDec.prototype.int16schema = {
//     primitive: true,
//     type: 'int',
//     bytes: 2
// };

// CoDec.prototype.tileSchema = {
//     propertiesBytes: 1,
//     numerical: {
//         x: 2,
//         y: 2
//     }
// };

// CoDec.prototype.playerRouteSchema = {
//     propertiesBytes: 1,
//     numerical: {
//         orientation: 1,
//         delta: 2
//     },
//     standAlone: {
//         end: this.tileSchema
//     }
// };

// CoDec.prototype.monsterRouteSchema = {
//     propertiesBytes: 1,
//     numerical: {
//         delta: 2
//     },
//     arrays: {
//         path: this.tileSchema
//     }
// };

// CoDec.prototype.playerSchema = {
//     propertiesBytes: 2,
//     numerical: {
//         id: this.bytesPerID,
//         x: 2,
//         y: 2,
//         weapon: 1,
//         armor: 1,
//         aoi: 2,
//         targetID: this.bytesPerID
//     },
//     strings: ['name'],
//     booleans: ['inFight', 'alive'],
//     standAlone: {
//         route: this.playerRouteSchema
//     }
// };

// CoDec.prototype.itemSchema = {
//     propertiesBytes: 2,
//     numerical: {
//         id: this.bytesPerID,
//         x: 2,
//         y: 2,
//         itemID: 1
//     },
//     booleans: ['visible', 'respawn', 'chest', 'inChest', 'loot']
// };

// CoDec.prototype.monsterSchema = {
//     propertiesBytes: 2,
//     numerical: {
//         id: this.bytesPerID,
//         x: 2,
//         y: 2,
//         targetID: this.bytesPerID,
//         lastHitter: this.bytesPerID,
//         monster: 1
//     },
//     booleans: ['inFight', 'alive'],
//     standAlone: {
//         route: this.monsterRouteSchema
//     }
// };
// CoDec.prototype.globalUpdateSchema = {
//     propertiesBytes: 1, // How many bytes to use to indicate the presence/absence of fields in the object; Limits the number of encodable fields to 8*propertiesBytes
//     arrays: {
//         newplayers: this.playerSchema,
//         newitems: this.itemSchema,
//         newmonsters: this.monsterSchema,
//         disconnected: this.int16schema
//     },
//     maps: {
//         players: this.playerSchema,
//         monsters: this.monsterSchema,
//         items: this.itemSchema
//     }
// };

// CoDec.prototype.hpSchema = {
//     propertiesBytes: 1,
//     numerical: {
//         hp: 1,
//         from: this.bytesPerID
//     },
//     booleans: ['target']
// };

// CoDec.prototype.localUpdateSchema = {
//     propertiesBytes: 1,
//     numerical: {
//         life: 1,
//         x: 2,
//         y: 2
//     },
//     booleans: ['noPick'],
//     arrays: {
//         hp: this.hpSchema,
//         killed: this.int16schema,
//         used: this.int16schema
//     }
// };

// CoDec.prototype.finalUpdateSchema = {
//     propertiesBytes: 1,
//     numerical: {
//         latency: 2,
//         stamp: this.stampBytes,
//         nbconnected: 1
//     },
//     standAlone: {
//         global: this.globalUpdateSchema,
//         local: this.localUpdateSchema
//     }
// };

// CoDec.prototype.initializationSchema = {
//     propertiesBytes: 1,
//     numerical: {
//         stamp: this.stampBytes,
//         nbconnected: 1,
//         nbAOIhorizontal: 1,
//         lastAOIid: 2
//     },
//     standAlone: {
//         player: this.playerSchema
//     }
// };
