// Small built-in dataset, used only when the YGOPRODeck API can't be reached.
// It holds a handful of real printings so the app still demos offline. It is NOT complete:
// box set reports from sample data list only the cards included here.
// Shapes mirror the API: cards look like cardinfo.php entries, sets like cardsets.php entries.
window.PULSE_SAMPLE = {
  sets: [
    { set_name: "Legend of Blue Eyes White Dragon", set_code: "LOB" },
    { set_name: "Starter Deck: Yugi", set_code: "SDY" },
    { set_name: "Starter Deck: Kaiba", set_code: "SDK" },
    { set_name: "Magician's Force", set_code: "MFC" },
    { set_name: "Duelist Pack: Yugi", set_code: "DPYG" },
    { set_name: "Legendary Collection 3: Yugi's World Mega Pack", set_code: "LCYW" },
    { set_name: "Quarter Century Bonanza", set_code: "RA03" },
    { set_name: "Quarter Century Stampede", set_code: "RA04" }
  ],
  cards: [
    {
      name: "Dark Magician",
      desc: "The ultimate wizard in terms of attack and defense.",
      card_sets: [
        { set_name: "Legend of Blue Eyes White Dragon", set_code: "LOB-005", set_rarity: "Ultra Rare" },
        { set_name: "Starter Deck: Yugi", set_code: "SDY-006", set_rarity: "Ultra Rare" },
        { set_name: "Duelist Pack: Yugi", set_code: "DPYG-EN001", set_rarity: "Rare" },
        { set_name: "Legendary Collection 3: Yugi's World Mega Pack", set_code: "LCYW-EN001", set_rarity: "Secret Rare" },
        { set_name: "Quarter Century Bonanza", set_code: "RA03-EN080", set_rarity: "Platinum Secret Rare" },
        { set_name: "Quarter Century Bonanza", set_code: "RA03-EN080", set_rarity: "Quarter Century Secret Rare" },
        { set_name: "Quarter Century Stampede", set_code: "RA04-EN106", set_rarity: "Platinum Secret Rare" },
        { set_name: "Quarter Century Stampede", set_code: "RA04-EN106", set_rarity: "Quarter Century Secret Rare" }
      ]
    },
    {
      name: "Dark Magician Girl",
      desc: "Gains 300 ATK for every \"Dark Magician\" or \"Magician of Black Chaos\" in the GY.",
      card_sets: [
        { set_name: "Magician's Force", set_code: "MFC-000", set_rarity: "Secret Rare" }
      ]
    },
    {
      name: "Blue-Eyes White Dragon",
      desc: "This legendary dragon is a powerful engine of destruction. Virtually invincible, very few have faced this awesome creature and lived to tell the tale.",
      card_sets: [
        { set_name: "Legend of Blue Eyes White Dragon", set_code: "LOB-001", set_rarity: "Ultra Rare" },
        { set_name: "Starter Deck: Kaiba", set_code: "SDK-001", set_rarity: "Ultra Rare" }
      ]
    }
  ]
};
