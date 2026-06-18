/* global FNOSP_FRONT */
( function () {
	'use strict';

	function esc( s ) {
		var d = document.createElement( 'div' );
		d.textContent = null === s || undefined === s ? '' : String( s );
		return d.innerHTML;
	}

	function badgeClass( signal ) {
		if ( 'BUY' === signal ) { return 'buy'; }
		if ( 'SELL' === signal ) { return 'sell'; }
		return 'notrade';
	}

	function cell( cls, k, v ) {
		return '<div class="fnosp-w-cell ' + cls + '"><div class="k">' + esc( k ) + '</div><div class="v">' + esc( v ) + '</div></div>';
	}

	function render( data ) {
		var html = '';

		html += '<div class="fnosp-w-top">';
		html += '<span class="fnosp-w-badge ' + badgeClass( data.signal ) + '">' + esc( data.signal ) + '</span>';
		html += '<span class="fnosp-w-price">₹' + esc( data.ltp ) + ' <small>' + esc( data.trend_label ) + '</small></span>';
		html += '</div>';

		var conf = Math.max( 0, Math.min( 100, data.confidence || 0 ) );
		html += '<div class="fnosp-w-conf">Confidence: <strong>' + esc( data.confidence ) + '%</strong></div>';
		html += '<div class="fnosp-w-meter"><span style="width:' + conf + '%"></span></div>';

		if ( data.setup ) {
			html += '<div class="fnosp-w-grid">';
			html += cell( 'entry', 'Entry', '₹' + data.setup.entry_low + ' – ₹' + data.setup.entry_high );
			html += cell( 'sl', 'Stop Loss', '₹' + data.setup.stop_loss );
			html += cell( 't1', 'Target 1', '₹' + data.setup.target1 );
			html += cell( 't2', 'Target 2', '₹' + data.setup.target2 );
			html += cell( 't3', 'Target 3', '₹' + data.setup.target3 );
			html += cell( 'rr', 'Risk:Reward', data.setup.risk_reward );
			html += '</div>';
		}

		if ( data.option_strategy && data.option_strategy.primary ) {
			html += '<div class="fnosp-w-conf"><strong>Strategy:</strong> ' + esc( data.option_strategy.primary );
			if ( data.option_strategy.legs && data.option_strategy.legs[ 0 ] ) {
				html += ' · ' + esc( data.option_strategy.legs[ 0 ].strike ) + ' (' + esc( data.option_strategy.legs[ 0 ].premium_range ) + ')';
			}
			html += '</div>';
		}

		if ( data.final_verdict ) {
			html += '<div class="fnosp-w-verdict">' + esc( data.final_verdict ) + '</div>';
		}

		if ( data.ai && data.ai.narrative ) {
			html += '<div class="fnosp-w-ai">' + esc( data.ai.narrative ) + '</div>';
		}

		html += '<div class="fnosp-w-meta">Source: ' + esc( data.source ) + ( data.cached ? ' (cached)' : '' ) + ' · ' + esc( data.generated_at ) + '</div>';
		if ( data.disclaimer ) {
			html += '<div class="fnosp-w-disc">' + esc( data.disclaimer ) + '</div>';
		}

		return html;
	}

	function load( widget ) {
		var body = widget.querySelector( '.fnosp-widget-body' );
		var instrument = widget.getAttribute( 'data-instrument' );
		var ai = widget.getAttribute( 'data-ai' ) || '0';

		body.innerHTML = '<p class="fnosp-w-loading">' + esc( FNOSP_FRONT.i18n.loading ) + '</p>';

		var url = FNOSP_FRONT.restUrl + '?instrument=' + encodeURIComponent( instrument ) + '&ai=' + encodeURIComponent( ai );

		fetch( url, {
			headers: { 'X-WP-Nonce': FNOSP_FRONT.nonce },
			credentials: 'same-origin'
		} )
			.then( function ( r ) { return r.json().then( function ( j ) { return { ok: r.ok, body: j }; } ); } )
			.then( function ( res ) {
				if ( ! res.ok ) {
					var msg = res.body && res.body.message ? res.body.message : FNOSP_FRONT.i18n.error;
					body.innerHTML = '<p class="fnosp-w-error">' + esc( msg ) + '</p>';
					return;
				}
				body.innerHTML = render( res.body );
			} )
			.catch( function () {
				body.innerHTML = '<p class="fnosp-w-error">' + esc( FNOSP_FRONT.i18n.error ) + '</p>';
			} );
	}

	function init( widget ) {
		load( widget );

		var btn = widget.querySelector( '.fnosp-refresh-btn' );
		if ( btn ) {
			btn.addEventListener( 'click', function () { load( widget ); } );
		}

		var refresh = parseInt( widget.getAttribute( 'data-refresh' ), 10 );
		if ( refresh && refresh >= 5 ) {
			setInterval( function () { load( widget ); }, refresh * 1000 );
		}
	}

	document.addEventListener( 'DOMContentLoaded', function () {
		var widgets = document.querySelectorAll( '.fnosp-widget' );
		Array.prototype.forEach.call( widgets, init );
	} );
} )();
