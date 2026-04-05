import ReactEcs, { UiEntity} from '@dcl/sdk/react-ecs'
import { Color4 } from "@dcl/sdk/math"

export const SectionHeader = ({ title }: { title: string }) => {
	return (
		<UiEntity
		uiTransform={{
			width: '100%',
			height: 'auto',
			padding: { top: 10, bottom: 5 }
		}}
		uiText={{
			value: title,
			fontSize: 20,
			color: Color4.create(1, 0.8, 0.3, 1),
			textAlign: 'middle-left'
		}}
		/>
	)
}

export const Divider = () => {
	return (
		<UiEntity
		uiTransform={{
			width: '100%',
			height: 2,
			margin: { top: 10, bottom: 10 }
		}}
		uiBackground={{
			color: Color4.create(0.3, 0.3, 0.3, 1)
		}}
		/>
	)
}

export const InfoRow = ({ label, value, fontSize, firstColumnWidth }: { label: string; value: string, fontSize?: number, firstColumnWidth?: number }) => {
	return (
		<UiEntity
		uiTransform={{
			width: '100%',
			height: 'auto',
			padding: { top: 5, bottom: 5 },
			flexDirection: 'row'
		}}
		>
		<UiEntity
		uiTransform={{
			width: firstColumnWidth !== undefined ? `${firstColumnWidth}%` : "50%",
			height: 'auto'
		}}
		uiText={{
			value: label,
			fontSize: fontSize ?? 16,
			color: Color4.create(0.7, 0.7, 0.7, 1),
			textAlign: 'middle-left'
		}}
		/>
		<UiEntity
		uiTransform={{
			width: firstColumnWidth !== undefined ? `${100 - firstColumnWidth}%` : "50%",
			height: 'auto'
		}}
		uiText={{
			value: value,
			fontSize: fontSize ?? 16,
			color: Color4.White(),
			textAlign: 'middle-left'
		}}
		/>
		</UiEntity>
	)
}
