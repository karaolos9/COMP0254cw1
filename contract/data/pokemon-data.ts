export interface PokemonMintData {
  name: string;
  ipfsHash: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    special: number;
    pokemonType: number;
  };
}

export const pokemonList: PokemonMintData[] = [
  {
    name: "Jungle Pikachu",
    ipfsHash: "bafybeiace3j7ff56dwjbwbr5yyox4hvjviue56iigic445gjfvnn3v4g5a",
    stats: {
      hp: 75,
      attack: 70,
      defense: 65,
      speed: 90,
      special: 85,
      pokemonType: 4  // GRASS type
    }
  },
  {
    name: "Drip Pikachu",
    ipfsHash: "bafybeie4nug2t2enrzpw7twr63o5jgl5sxrb3c55mrlnlsejgpy7na3hry",
    stats: {
      hp: 80,
      attack: 65,
      defense: 60,
      speed: 85,
      special: 95,
      pokemonType: 17  // FAIRY type
    }
  },
  {
    name: "Dreadthorn",
    ipfsHash: "bafybeievtzapp6hzf6foybrtwcj7uyex3zh6k7hbgywmvppemqt2zzc3p4",
    stats: {
      hp: 90,
      attack: 85,
      defense: 80,
      speed: 70,
      special: 75,
      pokemonType: 4  // GRASS type
    }
  },
  {
    name: "Volterraze",
    ipfsHash: "bafybeiamxnydxm435za3aelzxccrcfzwun7tku5mkmz2tksqawllvp2ljm",
    stats: {
      hp: 70,
      attack: 80,
      defense: 65,
      speed: 95,
      special: 85,
      pokemonType: 9  // FLYING type
    }
  },
  {
    name: "Pyroclash",
    ipfsHash: "bafybeicqzplotasw2aq4w4tycmzsgilatkqtiie6mdoggkii556jq5sauq",
    stats: {
      hp: 85,
      attack: 95,
      defense: 75,
      speed: 80,
      special: 90,
      pokemonType: 1  // FIRE type
    }
  },
  {
    name: "Snathermite",
    ipfsHash: "bafybeih4ddjffafbvpmj3zv42jtvpfiwmhshezisekxphtmp2eauh7rlle",
    stats: {
      hp: 70,
      attack: 85,
      defense: 60,
      speed: 75,
      special: 65,
      pokemonType: 11  // BUG type
    }
  },
  {
    name: "Lumelune",
    ipfsHash: "bafybeicr72fnrc3knhbwj2owmncxivpbp4ofgyoqgubqv2t5okeopo6ziy",
    stats: {
      hp: 80,
      attack: 65,
      defense: 70,
      speed: 85,
      special: 95,
      pokemonType: 17  // FAIRY type
    }
  },
  {
    name: "Frostailis",
    ipfsHash: "bafybeiagdicysztyrdqzgoiksoawhzj4rv4b3sxowyhgklsjexbwlvoxdm",
    stats: {
      hp: 75,
      attack: 80,
      defense: 70,
      speed: 90,
      special: 85,
      pokemonType: 5  // ICE type
    }
  },
  {
    name: "Aetherion",
    ipfsHash: "bafybeig4nlan66yyoyjys3w2ofjukxttbhkuge7idfklccxjynufohvlre",
    stats: {
      hp: 90,
      attack: 75,
      defense: 80,
      speed: 95,
      special: 100,
      pokemonType: 18  // LIGHT type
    }
  },
  {
    name: "Shiny Pikachiu",
    ipfsHash: "bafybeicjojzkwdmrtx3hxna6klttdcijxaggzneic5n43nfkotxhywljke",
    stats: {
      hp: 75,
      attack: 70,
      defense: 65,
      speed: 95,
      special: 90,
      pokemonType: 17  // FAIRY type
    }
  },
  {
    name: "Umbrythos",
    ipfsHash: "bafybeif4wvhpyq4d26tmibubmgpqi3barwrjerwqz7nzf7qnqfe6ieypti",
    stats: {
      hp: 80,
      attack: 85,
      defense: 70,
      speed: 90,
      special: 95,
      pokemonType: 14  // GHOST type
    }
  },
    {
      name: "Pilithar",
      ipfsHash: "bafybeihumltmwnaq3iobemkvsos3bx4nbyt2eqvgb44ygwgx5o3q7r6cqm",
      stats: {
        hp: 90,
        attack: 60,
        defense: 75,
        speed: 80,
        special: 95,
        pokemonType: 17  // FAIRY type
      }
    },
    {
      name: "Steel Pikachiu",
      ipfsHash: "bafybeiaxj53qqukisne4qv4iserwuksloyypurjcvynf24nayavg3pfo4e",
      stats: {
        hp: 70,
        attack: 85,
        defense: 90,
        speed: 80,
        special: 75,
        pokemonType: 16  // STEEL type
      }
    },
    {
      name: "Steelchiu",
      ipfsHash: "bafybeib4447quxumz3cvxrtyorowdlvndiqibdejlzfkadzoy2ejzrsgoe",
      stats: {
        hp: 75,
        attack: 80,
        defense: 95,
        speed: 75,
        special: 80,
        pokemonType: 16  // STEEL type
      }
    },
    {
      name: "Scizor",
      ipfsHash: "bafybeif47npkedxbiifzlau7vxa6axnqwt7xufwismxihuicnd6dsslq3i",
      stats: {
        hp: 80,
        attack: 95,
        defense: 100,
        speed: 70,
        special: 75,
        pokemonType: 16  // STEEL type
      }
    },
    {
      name: "Steelix",
      ipfsHash: "bafybeicwevioscnpyz5qmhmh2kri7vxh7ay7uyfq4n35bda5msdgkav7jy",
      stats: {
        hp: 95,
        attack: 85,
        defense: 100,
        speed: 50,
        special: 65,
        pokemonType: 16  // STEEL type
      }
    },
    {
      name: "Froppy",
      ipfsHash: "bafybeibrdvbpprzjgepzmhzfrhx7fdxgdrq3a55a5at45on2sayx3uf37q",
      stats: {
        hp: 85,
        attack: 70,
        defense: 75,
        speed: 95,
        special: 80,
        pokemonType: 2  // WATER type
      }
    },
    {
      name: "Grimvine",
      ipfsHash: "bafybeiejy3xymiloba42atrpxea3tceuq2y3sz7zuegmlnpjeu75rpeibu",
      stats: {
        hp: 90,
        attack: 85,
        defense: 70,
        speed: 80,
        special: 95,
        pokemonType: 14  // GHOST type
      }
    },
    {
      name: "Thunper",
      ipfsHash: "bafybeifw4xeod7liy4cazbwms5j7qakeamb7jjak6gl3k3pp3fjupu7jdy",
      stats: {
        hp: 75,
        attack: 80,
        defense: 70,
        speed: 100,
        special: 90,
        pokemonType: 3  // ELECTRIC type
      }
    },
    {
      name: "Aquachiu",
      ipfsHash: "bafybeihtsflb4qf7skyyklbsmo4rfnbvrmqhpovycoakaavh6b3azbysyu",
      stats: {
        hp: 80,
        attack: 75,
        defense: 70,
        speed: 85,
        special: 90,
        pokemonType: 2  // WATER type
      }
    }
  ];