export type PlayerStatsRecord = Record<PlayerStats, number>

export enum PlayerStats {
	GAMES_CREATED       = "gamesCreated",
	GAMES_PLAYED        = "gamesPlayed",
	GAMES_WON           = "gamesWon",
	GAMES_LEFT_EARLY    = "gamesLeftEarly",

	ROLLED_BALLS        = "rolledBalls",	
	ROLLED_STRIKES      = "rolledStrikes",
	ROLLED_SPARES       = "rolledSpares",
	ROLLED_GUTTER_BALLS = "rolledGutterBalls",

	PINS_KNOCKED_DOWN   = "pinsKnockedDown",
}
