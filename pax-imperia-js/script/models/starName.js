export class StarName {

    stars = [
        "Achernar",
        "Acrux",
        "Adhara",
        "Al Dhanab",
        "Aldebaran",
        "Algieba",
        "Algol",
        "Alhena",
        "Alioth",
        "Alkaid",
        "Alnair",
        "Alnilam",
        "Alnitak",
        "Alphard",
        "Altair",
        "Antares",
        "Arcturus",
        "Atria",
        "Avior",
        "Bellatrix",
        "Betelgeuse",
        "Canopus",
        "Capella",
        "Castor",
        "Deneb",
        "Dubhe",
        "Elnath",
        "Fomalhaut",
        "Gacrux",
        "Hadar",
        "Hama",

        "Koo She",
        "Kochab",
        "Ras Alhague",
        "Algol",
        "Alamak",
        "Denebola",
        "Naos",
        "Tureis",
        "Gemma",
        "Sadr",
        "Schedar",
        "Eltanin",
        "Caph",
        "Dschubba",
        "Merak",
        "Izar",

        "Menkalinan",
        "Miaplacidus",
        "Mimosa",
        "Mintaka",
        "Mirach",
        "Mirfak",
        "Mirzam",
        "Mizar",
        "Peacock",
        "Polaris",
        "Pollux",
        "Procyon",
        "Regor",
        "Regulus",
        "Rigel",
        "Saiph",
        "Sargas",
        "Shaula",
        "Sirius",
        "Spica",
        "Vega",
        "Wezen"
    ];

    pick() {
        return this.stars.splice(Math.random()*this.stars.length, 1)[0];
    }
}
