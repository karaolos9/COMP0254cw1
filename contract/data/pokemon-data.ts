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
    }
  ];
  