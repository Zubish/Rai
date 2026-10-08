const feedback = {
  model_unavailable: ['The response could not be generated.', 'The intelligence service could not be reached, did not respond in time, or rejected the request.', 'Check that Ollama is running and the selected model is installed, then retry. For hosted Rai, ask your administrator to check the inference service.', true],
  model_not_configured: ['The response could not be generated.', 'An approved hosted intelligence endpoint and its server credential have not been configured.', 'Ask your administrator to complete inference setup, or use the configured local development instance.', false],
  invalid_model_response: ['The response could not be completed.', 'The intelligence service returned an empty or invalid response.', 'Retry once. If this continues, ask your administrator to check model compatibility.', true],
  connection_not_enabled: ['RxLedger connection is not available yet.', 'Live access has not been enabled for this instance.', 'Use RxLedger reports for now. Your administrator must complete consent testing and enable the connection before you can approve access.', false],
  rxledger_not_configured: ['The analysis could not be run.', 'The server connection to RxLedger is not configured.', 'Ask your administrator to finish the RxLedger integration, then connect and approve your workspace.', false],
  rxledger_unavailable: ['The analysis could not be run.', 'RxLedger did not respond to the approved data request.', 'Retry shortly. If the problem persists, ask your administrator to check RxLedger availability.', true],
  invalid_snapshot_scope: ['The analysis was blocked.', 'The returned data did not match the approved workspace, branch or reporting period.', 'Do not rely on this response. Ask your administrator to check the integration scope before retrying.', false]
};

export function publicFailure(error) {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 ? error.status : 500;
  const known = feedback[error?.code];
  const fallback = status === 401
    ? ['The task was not executed.', 'No valid signed-in RxLedger connection could be verified.', 'Connect or reconnect RxLedger and approve the required workspace and branch.', false]
    : status === 403
      ? ['The task was not executed.', 'The request is not allowed by the current workspace permissions or browser security rules.', 'Open Rai from its normal address and check the approved branches and analytics permissions. Ask your administrator if access is still denied.', false]
      : status === 429
        ? ['The task is temporarily paused.', 'Too many requests were sent in a short period.', 'Wait one minute, then retry.', true]
        : status < 500
          ? ['The request could not be accepted.', 'The request does not meet the endpoint or input requirements.', 'Check the request and its dates, shorten it if necessary, then try again.', false]
          : ['The task could not be completed.', 'An internal service failure occurred; the precise cause could not be confirmed safely.', 'Retry once. If it continues, contact your administrator with this error code, not private pharmacy data.', true];
  const [message, reason, nextStep, retryable] = known || fallback;
  return { status, error: { code: known ? error.code : status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : status === 429 ? 'rate_limit_exceeded' : 'request_failed', message, reason, nextStep, retryable } };
}
