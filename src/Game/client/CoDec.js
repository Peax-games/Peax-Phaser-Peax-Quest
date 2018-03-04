// This class contains information about the expected structure of the different objects that can be transmitted
// between the client and the server, in order to guide the encoding/decoding process
export default function CoDec() {
        this.bytesPerChar = 1; // How many bytes to encode a character of a string
        this.bytesPerID = 2; // How many bytes to encode numerical id's (a maximum id of 2^16 = 65536 seems reasonable for a small game, "real" games should use at least 3 bytes)
        this.booleanBytes = 1; // How many bytes to use to represent booleans (= 8 booleans per byte allocated),
        this.stampBytes = 4; // How many bytes to encode timestamp (a timestamp takes more room than 4 bytes, but only the last 4 bytes are relevant, since the time spans incoded in the remaining ones are too big to be useful)

}

var bytesPerChar = 1; // How many bytes to encode a character of a string
        var bytesPerID = 2; // How many bytes to encode numerical id's (a maximum id of 2^16 = 65536 seems reasonable for a small game, "real" games should use at least 3 bytes)
        var booleanBytes = 1; // How many bytes to use to represent booleans (= 8 booleans per byte allocated),
       var stampBytes = 4;

CoDec.int16schema = {
    primitive: true,
    type: 'int',
    bytes: 2
};

CoDec.tileSchema = {
    propertiesBytes: 1,
    numerical: {
        x: 2,
        y: 2
    }
};

CoDec.playerRouteSchema = {
    propertiesBytes: 1,
    numerical: {
        orientation: 1,
        delta: 2
    },
    standAlone: {
        end: CoDec.tileSchema
    }
};

CoDec.monsterRouteSchema = {
    propertiesBytes: 1,
    numerical: {
        delta: 2
    },
    arrays: {
        path: CoDec.tileSchema
    }
};

CoDec.playerSchema = {
    propertiesBytes: 2,
    numerical: {
        id: bytesPerID,
        x: 2,
        y: 2,
        weapon: 1,
        armor: 1,
        aoi: 2,
        targetID: bytesPerID
    },
    strings: ['name'],
    booleans: ['inFight', 'alive'],
    standAlone: {
        route: CoDec.playerRouteSchema
    }
};

CoDec.itemSchema = {
    propertiesBytes: 2,
    numerical: {
        id: bytesPerID,
        x: 2,
        y: 2,
        itemID: 1
    },
    booleans: ['visible', 'respawn', 'chest', 'inChest', 'loot']
};

CoDec.monsterSchema = {
    propertiesBytes: 2,
    numerical: {
        id: bytesPerID,
        x: 2,
        y: 2,
        targetID: bytesPerID,
        lastHitter: bytesPerID,
        monster: 1
    },
    booleans: ['inFight', 'alive'],
    standAlone: {
        route: CoDec.monsterRouteSchema
    }
};
CoDec.globalUpdateSchema = {
    propertiesBytes: 1, // How many bytes to use to indicate the presence/absence of fields in the object; Limits the number of encodable fields to 8*propertiesBytes
    arrays: {
        newplayers: CoDec.playerSchema,
        newitems: CoDec.itemSchema,
        newmonsters: CoDec.monsterSchema,
        disconnected: CoDec.int16schema
    },
    maps: {
        players: CoDec.playerSchema,
        monsters: CoDec.monsterSchema,
        items: CoDec.itemSchema
    }
};

CoDec.hpSchema = {
    propertiesBytes: 1,
    numerical: {
        hp: 1,
        from: bytesPerID
    },
    booleans: ['target']
};

CoDec.localUpdateSchema = {
    propertiesBytes: 1,
    numerical: {
        life: 1,
        x: 2,
        y: 2
    },
    booleans: ['noPick'],
    arrays: {
        hp: CoDec.hpSchema,
        killed: CoDec.int16schema,
        used: CoDec.int16schema
    }
};

CoDec.finalUpdateSchema = {
    propertiesBytes: 1,
    numerical: {
        latency: 2,
        stamp: stampBytes,
        nbconnected: 1
    },
    standAlone: {
        global: CoDec.globalUpdateSchema,
        local: CoDec.localUpdateSchema
    }
};

CoDec.initializationSchema = {
    propertiesBytes: 1,
    numerical: {
        stamp: stampBytes,
        nbconnected: 1,
        nbAOIhorizontal: 1,
        lastAOIid: 2
    },
    standAlone: {
        player: CoDec.playerSchema
    }
};
