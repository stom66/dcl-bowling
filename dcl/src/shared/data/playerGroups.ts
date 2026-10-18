/**
 * Wallets grouped for login rewards. Address checks are case-insensitive.
 *
 * `playtesters` is a list of addresses.
 * `specialPlayers` maps an address to the name used in their call-out.
 */


export const playtesters: string[] = [
	"0x1e105bb213754519903788022b962fe2b9c4b263", // BayBackner
	"0x4b538e1e044922aec2f428ec7e17a99f44205ff9", // carlosmu
	"0x510af22af2e65b97a17dda242dc71acc1beaee2d", // daf
	"0xa7cdf25a0211c089a0338c0e5b204a34ac180489", // Dafucita
	"0x327f74101f930c76653fd11ac7c8ba3c8694678f", // DanL
	"0xc1fc4a94af8ac60df3667deb45a83f1896bb17d2", // Evee
	"0x1e93e534c5e26b01ed242410b43ae23dd0faa52b", // ile
	"0x8a89a7348d464bbb8c516a4d5390e7de51affa5d", // Kenzo
	"0xe2b6024873d218b2e83b462d3658d8d7c3f55a18", // NicoE
	"0xd8166f3e3cbbb70fb7ec78ad4238ec7a440c1ef4", // pepino
	"0x57d1721f6223eb434e20f5b4a88e494008ea0542", // PeterParkerWeb3
	"0xbe21e2cbac649134e1b113e613f0dad15c91a9e2", // PixelArcade
	"0xed5126ab51e6b62b9cf9f40f2aee525c20534e8f", // ReverbMayo
	"0xc3af1190dfc0cb4184c114baf5147512a6b8d257", // Rowan
	"0xc9c29ab98e6bc42015985165a11153f564e9f8c2", // Ryumi
	"0xfe2d424af0df49bb3316cb2e9f574b0d09cf98ad", // Samara
	"0x74eb59457cac3a0d60cff214dedc87d347b272a7", // Seren Sunflare
	"0xd545b9e0a5f3638a5026d1914cc9b47ed16b5ae9", // ShadowPixie
	"0xcec7e38e088a87d77f2b60fcae6840d00e018155", // stom
	"0x23be90335e79d3245615985d91f69814f98a0fab", // SWISSVERSE
	"0x191aaa857c8ce4c76f582336101ae2dc55e4a2fa", // TomzEvz
	"0x8684949ced18dd3c9eb3c2fa6a35a99064cac8a0", // WiseDove75992
	"0xf4e0277f006a1a00e2691ea4bdf1022ce4bb6fad", // ToxSam
]


/**
 * Players who have been here since the game first came out.
 * The value is the name in their "{name} Special" reward.
 */
export const specialPlayers: Record<string, string> = {
	"0x53e22947510ad64ae85c96526bdbedb0b3e54f31": "JaeName",
	"0xd2b1116d2eac248b267bb51cc96c1b035d73d9e7": "RimuruT",
	"0xdbcff1cc78019a769888ee21aa1fbfc7011e3501": "Tea-time",
	"0xc1fc4a94af8ac60df3667deb45a83f1896bb17d2": "Evee",
	"0xddf0e06b3b52eb6d081c5e76be6d9879fe8d6a1b": "Super-Stephy",
	"0xcec7e38e088a87d77f2b60fcae6840d00e018155": "stom" , // stom
}



// MARK: isPlaytester
/**
 * True when `userId` is listed in `playtesters`.
 */
export function isPlaytester(userId: string): boolean {
	if (!userId) return false
	const needle = userId.toLowerCase()
	return playtesters.some((address) => address.toLowerCase() === needle)
}



// MARK: getSpecialPlayerName
/**
 * The call-out name for a wallet in `specialPlayers`, if they have one.
 */
export function getSpecialPlayerName(userId: string): string | undefined {
	if (!userId) return undefined
	const needle = userId.toLowerCase()
	for (const [address, name] of Object.entries(specialPlayers)) {
		if (address.toLowerCase() !== needle) continue
		const trimmed = name.trim()
		return trimmed === '' ? undefined : trimmed
	}
	return undefined
}
