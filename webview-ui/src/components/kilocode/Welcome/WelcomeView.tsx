import { useCallback, useState } from "react"
import { useExtensionState } from "../../../context/ExtensionStateContext"
import { validateApiConfiguration } from "../../../utils/validate"
import { vscode } from "../../../utils/vscode"
import { Tab, TabContent } from "../../common/Tab"
import { useAppTranslation } from "../../../i18n/TranslationContext"
import { ButtonPrimary } from "../common/ButtonPrimary"
import { ButtonSecondary } from "../common/ButtonSecondary"
import { ButtonLink } from "../common/ButtonLink"
import ApiOptions from "../../settings/ApiOptions"
import { getKiloCodeBackendAuthUrl } from "../helpers"

const WelcomeView = () => {
	const { apiConfiguration, currentApiConfigName, setApiConfiguration, uriScheme, uiKind } = useExtensionState()
	const [errorMessage, setErrorMessage] = useState<string | undefined>()
	const [manualConfig, setManualConfig] = useState(false)
	const { t } = useAppTranslation()

	const handleSubmit = useCallback(() => {
		const error = apiConfiguration ? validateApiConfiguration(apiConfiguration) : undefined

		if (error) {
			setErrorMessage(error)
			return
		}

		setErrorMessage(undefined)
		vscode.postMessage({ type: "upsertApiConfiguration", text: currentApiConfigName, apiConfiguration })
	}, [apiConfiguration, currentApiConfigName])

	const isSettingUpKiloCode =
		!apiConfiguration?.apiProvider ||
		(apiConfiguration?.apiProvider === "kilocode" && !apiConfiguration?.kilocodeToken)

	return (
		<Tab>
			<TabContent className="flex flex-col gap-5">
				<h2 className="m-0 p-0">{t("kilocode:welcome.greeting")}</h2>
				<div>{t("kilocode:welcome.introText")}</div>
				{manualConfig ? (
					<>
						<ApiOptions
							fromWelcomeView
							apiConfiguration={apiConfiguration || {}}
							uriScheme={uriScheme}
							uiKind={uiKind}
							setApiConfigurationField={(field, value) => setApiConfiguration({ [field]: value })}
							errorMessage={errorMessage}
							setErrorMessage={setErrorMessage}
							hideKiloCodeButton
						/>
						{isSettingUpKiloCode ? (
							<ButtonLink href={getKiloCodeBackendAuthUrl(uriScheme, uiKind)}>
								{t("kilocode:welcome.ctaButton")}
							</ButtonLink>
						) : (
							<ButtonPrimary onClick={handleSubmit}>{t("welcome:start")}</ButtonPrimary>
						)}
					</>
				) : (
					<div className="bg-vscode-sideBar-background">
						<div className="flex flex-col gap-5">
							<ButtonLink
								href={getKiloCodeBackendAuthUrl(uriScheme, uiKind)}
								onClick={() => {
									if (uiKind === "Web") {
										setManualConfig(true)
									}
								}}>
								{t("kilocode:welcome.ctaButton")}
							</ButtonLink>
							<ButtonSecondary onClick={() => setManualConfig(true)}>
								{t("kilocode:welcome.manualModeButton")}
							</ButtonSecondary>
						</div>
					</div>
				)}
			</TabContent>
		</Tab>
	)
}

export default WelcomeView
