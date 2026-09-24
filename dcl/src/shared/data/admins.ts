export const admins = [
	"0xCEC7e38e088A87D77F2B60Fcae6840D00E018155", // stom
	"0xAD9BA78daa5fBF72166Ed003bdFa965DD9FDEc3B",
]

// MARK: isAdmin
/**
 * True when `userId` is listed in `admins`. Comparison is case-insensitive.
 */
export function isAdmin(userId: string): boolean {
	if (!userId) return false
	const needle = userId.toLowerCase()
	return admins.some((address) => address.toLowerCase() === needle)
}
