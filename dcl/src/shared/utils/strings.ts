export function getOrdinalSuffix(number: number) {
	if (number % 10 === 1 && number !== 11) {
		return "st"
	} else if (number % 10 === 2 && number !== 12) {
		return "nd"
	} else if (number % 10 === 3 && number !== 13) {
		return "rd"
	} else {
		return "th"
	}
}