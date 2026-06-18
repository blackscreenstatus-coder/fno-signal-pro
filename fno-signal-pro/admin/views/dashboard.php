<?php
/**
 * Admin dashboard view.
 *
 * @package FnO_Signal_Pro
 * @var FnOSP_Settings $settings
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$instruments = (array) $settings->get( 'instruments', array() );
$default     = $settings->get( 'default_instrument', 'NIFTY' );
$ai_ready    = $settings->ai_ready();

// Split instruments into Indices vs Stocks for clearer sections.
$index_set  = array( 'NIFTY', 'NIFTY50', 'BANKNIFTY', 'FINNIFTY', 'SENSEX', 'MIDCPNIFTY' );
$idx_list   = array();
$stock_list = array();
foreach ( $instruments as $sym ) {
	if ( in_array( strtoupper( $sym ), $index_set, true ) ) {
		$idx_list[] = $sym;
	} else {
		$stock_list[] = $sym;
	}
}
?>
<div class="wrap fnosp-wrap">
	<h1 class="fnosp-title">
		<span class="dashicons dashicons-chart-line"></span>
		<?php esc_html_e( 'F&O Signal Pro — Dashboard', 'fno-signal-pro' ); ?>
	</h1>

	<p class="fnosp-sub">
		<?php esc_html_e( 'Generate an institutional-grade signal using the 100-point framework. Output is decision-support only — not financial advice.', 'fno-signal-pro' ); ?>
	</p>

	<div class="fnosp-controls">
		<label for="fnosp-instrument"><?php esc_html_e( 'Instrument', 'fno-signal-pro' ); ?></label>
		<select id="fnosp-instrument">
			<?php if ( ! empty( $idx_list ) ) : ?>
				<optgroup label="<?php esc_attr_e( 'Indices', 'fno-signal-pro' ); ?>">
					<?php foreach ( $idx_list as $sym ) : ?>
						<option value="<?php echo esc_attr( $sym ); ?>" <?php selected( $sym, $default ); ?>><?php echo esc_html( $sym ); ?></option>
					<?php endforeach; ?>
				</optgroup>
			<?php endif; ?>
			<?php if ( ! empty( $stock_list ) ) : ?>
				<optgroup label="<?php esc_attr_e( 'Stocks', 'fno-signal-pro' ); ?>">
					<?php foreach ( $stock_list as $sym ) : ?>
						<option value="<?php echo esc_attr( $sym ); ?>" <?php selected( $sym, $default ); ?>><?php echo esc_html( $sym ); ?></option>
					<?php endforeach; ?>
				</optgroup>
			<?php endif; ?>
		</select>

		<label class="fnosp-ai-toggle <?php echo $ai_ready ? '' : 'fnosp-disabled'; ?>">
			<input type="checkbox" id="fnosp-use-ai" <?php disabled( ! $ai_ready ); ?> />
			<?php esc_html_e( 'AI commentary', 'fno-signal-pro' ); ?>
			<?php if ( ! $ai_ready ) : ?>
				<small>(<?php esc_html_e( 'configure API key in Settings', 'fno-signal-pro' ); ?>)</small>
			<?php endif; ?>
		</label>

		<label class="fnosp-ai-toggle">
			<input type="checkbox" id="fnosp-nocache" />
			<?php esc_html_e( 'Force refresh', 'fno-signal-pro' ); ?>
		</label>

		<button class="button button-primary" id="fnosp-generate">
			<?php esc_html_e( 'Generate Signal', 'fno-signal-pro' ); ?>
		</button>
	</div>

	<div id="fnosp-result" class="fnosp-result" aria-live="polite"></div>

	<div class="fnosp-help card">
		<h2><?php esc_html_e( 'Shortcode & REST', 'fno-signal-pro' ); ?></h2>
		<p><?php esc_html_e( 'Embed a live signal widget anywhere:', 'fno-signal-pro' ); ?></p>
		<code>[fno_signal instrument="NIFTY" ai="0" refresh="0"]</code>
		<p><?php esc_html_e( 'REST endpoint (auth required unless public access enabled):', 'fno-signal-pro' ); ?></p>
		<code><?php echo esc_html( rest_url( 'fnosp/v1/signal?instrument=NIFTY&ai=0' ) ); ?></code>
	</div>
</div>
