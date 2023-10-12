export default {
	pattern: () => 'test/browser/**/*.ctor.js',
	testRunnerHtml: testFramework =>
		`<!DOCTYPE html>
		<html>
			<body>
				<script>
				window.addEventListener('error', (err) => {
					if (err.message.includes('expected error')) {
						window.dispatchEvent(new CustomEvent('d2l-test-runner-expected-error'));
						err.stopImmediatePropagation();
					}
				});
				</script>
				<script type="module" src="${testFramework}"></script>
			</body>
		</html>`
};
