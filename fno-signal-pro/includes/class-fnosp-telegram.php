<?php
/**
 * Telegram notifier.
 *
 * Sends signal alerts to one or more Telegram chats via the free Telegram Bot
 * API. A bot token (free, created via @BotFather) and a chat id are required —
 * there is no paid key involved.
 *
 * @package FnO_Signal_Pro
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class FnOSP_Telegram {

	/** @var FnOSP_Settings */
	private $settings;

	public function __construct( FnOSP_Settings $settings ) {
		$this->settings = $settings;
	}

	/**
	 * Whether Telegram alerts are configured & enabled.
	 *
	 * @return bool
	 */
	public function ready() {
		return (bool) $this->settings->get( 'telegram_enabled' )
			&& '' !== trim( (string) $this->settings->get( 'telegram_token' ) )
			&& '' !== trim( (string) $this->settings->get( 'telegram_chat_id' ) );
	}

	/**
	 * Parsed list of chat ids (comma/space separated).
	 *
	 * @return string[]
	 */
	private function chat_ids() {
		$raw = (string) $this->settings->get( 'telegram_chat_id' );
		$ids = preg_split( '/[\s,]+/', $raw, -1, PREG_SPLIT_NO_EMPTY );
		return array_values( array_filter( array_map( 'trim', (array) $ids ) ) );
	}

	/**
	 * Send a raw HTML message to all configured chats.
	 *
	 * @param string $text HTML message.
	 * @return array|WP_Error { sent:int, failed:int } or error if not ready.
	 */
	public function send( $text ) {
		$token = trim( (string) $this->settings->get( 'telegram_token' ) );
		if ( '' === $token ) {
			return new WP_Error( 'fnosp_tg_token', __( 'Telegram bot token is not set.', 'fno-signal-pro' ) );
		}
		$chats = $this->chat_ids();
		if ( empty( $chats ) ) {
			return new WP_Error( 'fnosp_tg_chat', __( 'No Telegram chat id configured.', 'fno-signal-pro' ) );
		}

		$endpoint = 'https://api.telegram.org/bot' . rawurlencode( $token ) . '/sendMessage';
		$sent     = 0;
		$failed   = 0;
		$last_err = '';

		foreach ( $chats as $chat_id ) {
			$response = wp_remote_post(
				$endpoint,
				array(
					'timeout' => 15,
					'body'    => array(
						'chat_id'                  => $chat_id,
						'text'                     => $text,
						'parse_mode'               => 'HTML',
						'disable_web_page_preview' => 'true',
					),
				)
			);

			if ( is_wp_error( $response ) ) {
				$failed++;
				$last_err = $response->get_error_message();
				continue;
			}
			$code = wp_remote_retrieve_response_code( $response );
			$body = json_decode( wp_remote_retrieve_body( $response ), true );
			if ( 200 === $code && ! empty( $body['ok'] ) ) {
				$sent++;
			} else {
				$failed++;
				$last_err = isset( $body['description'] ) ? $body['description'] : ( 'HTTP ' . $code );
			}
		}

		if ( 0 === $sent ) {
			return new WP_Error( 'fnosp_tg_send', sprintf( /* translators: %s: error */ __( 'Telegram send failed: %s', 'fno-signal-pro' ), $last_err ) );
		}

		return array(
			'sent'   => $sent,
			'failed' => $failed,
		);
	}

	/**
	 * Send a formatted signal alert.
	 *
	 * @param array $result Engine signal result.
	 * @return array|WP_Error
	 */
	public function send_signal_alert( array $result ) {
		return $this->send( $this->format_signal( $result ) );
	}

	/**
	 * Build a rich HTML message for a signal.
	 *
	 * @param array $r Result.
	 * @return string
	 */
	public function format_signal( array $r ) {
		$emoji = 'BUY' === $r['signal'] ? '🟢' : ( 'SELL' === $r['signal'] ? '🔴' : '⚪️' );
		$e     = function ( $v ) {
			return esc_html( (string) $v );
		};

		$lines   = array();
		$lines[] = sprintf( '%s <b>%s %s</b>  (%s)', $emoji, $e( $r['signal'] ), $e( $r['instrument'] ), $e( $r['trend_label'] ) );
		$lines[] = sprintf( '📊 Confidence: <b>%s%%</b>', $e( $r['confidence'] ) );
		$lines[] = sprintf( '💰 LTP: ₹%s', $e( number_format_i18n( (float) $r['ltp'], 2 ) ) );

		if ( ! empty( $r['setup'] ) ) {
			$s       = $r['setup'];
			$lines[] = '';
			$lines[] = sprintf( '🎯 Entry: ₹%s – ₹%s', $e( $s['entry_low'] ), $e( $s['entry_high'] ) );
			$lines[] = sprintf( '🛑 Stop Loss: ₹%s', $e( $s['stop_loss'] ) );
			$lines[] = sprintf( '✅ Targets: ₹%s / ₹%s / ₹%s', $e( $s['target1'] ), $e( $s['target2'] ), $e( $s['target3'] ) );
			$lines[] = sprintf( '⚖️ R:R %s · ⏱ %s', $e( $s['risk_reward'] ), $e( $s['holding'] ) );
		}

		if ( ! empty( $r['option_strategy']['primary'] ) ) {
			$leg     = $r['option_strategy']['legs'][0] ?? null;
			$strike  = $leg ? ( ' · ' . $leg['strike'] . ' (' . $leg['premium_range'] . ')' ) : '';
			$lines[] = sprintf( '🧩 %s%s', $e( $r['option_strategy']['primary'] ), $e( $strike ) );
		}

		if ( ! empty( $r['final_verdict'] ) ) {
			$lines[] = '';
			$lines[] = '<i>' . $e( $r['final_verdict'] ) . '</i>';
		}

		if ( ! empty( $r['layman_summary']['text'] ) ) {
			$lines[] = '';
			$lines[] = '📝 <b>In simple words</b>';
			$lines[] = $e( $r['layman_summary']['text'] );
		}

		$lines[] = '';
		$lines[] = '<i>Educational analysis, not investment advice. F&amp;O is high risk.</i>';
		$lines[] = sprintf( '🕒 %s', $e( gmdate( 'Y-m-d H:i', time() ) . ' UTC' ) );

		return implode( "\n", $lines );
	}

	/**
	 * Send a test message.
	 *
	 * @return array|WP_Error
	 */
	public function test() {
		$text = "✅ <b>F&amp;O Signal Pro</b>\nTelegram alerts are connected and working.\n<i>You'll receive high-confidence signals here.</i>";
		return $this->send( $text );
	}
}
