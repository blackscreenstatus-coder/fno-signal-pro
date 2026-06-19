/* global FNOSP_ADMIN */
( function () {
	'use strict';

	function el( tag, cls, html ) {
		var n = document.createElement( tag );
		if ( cls ) { n.className = cls; }
		if ( undefined !== html ) { n.innerHTML = html; }
		return n;
	}

	function esc( s ) {
		var d = document.createElement( 'div' );
		d.textContent = null === s || undefined === s ? '' : String( s );
		return d.innerHTML;
	}

	function num( v ) {
		if ( null === v || undefined === v || '' === v ) { return '-'; }
		return v;
	}

	function badgeClass( signal ) {
		if ( 'BUY' === signal ) { return 'buy'; }
		if ( 'SELL' === signal ) { return 'sell'; }
		return 'notrade';
	}

	function renderSignal( data ) {
		var wrap = el( 'div', 'fnosp-card' );

		// Head.
		var head = el( 'div', 'fnosp-card-head' );
		var left = el( 'div' );
		left.appendChild( el( 'span', 'fnosp-badge ' + badgeClass( data.signal ), esc( data.signal ) ) );
		left.appendChild( el( 'span', '', ' &nbsp;<strong>' + esc( data.instrument ) + '</strong> @ ₹' + esc( data.ltp ) ) );
		head.appendChild( left );

		var conf = el( 'div', 'fnosp-conf' );
		conf.innerHTML = 'Confidence: <strong>' + esc( data.confidence ) + '%</strong> · ' + esc( data.trend_label );
		var meter = el( 'div', 'fnosp-meter' );
		meter.appendChild( el( 'span', '', '' ) );
		meter.firstChild.style.width = Math.max( 0, Math.min( 100, data.confidence ) ) + '%';
		conf.appendChild( meter );
		head.appendChild( conf );
		wrap.appendChild( head );

		// Setup tiles.
		if ( data.setup ) {
			var grid = el( 'div', 'fnosp-grid' );
			var tiles = [
				[ 'Entry', '₹' + num( data.setup.entry_low ) + ' – ₹' + num( data.setup.entry_high ) ],
				[ 'Stop Loss', '₹' + num( data.setup.stop_loss ) ],
				[ 'Target 1', '₹' + num( data.setup.target1 ) ],
				[ 'Target 2', '₹' + num( data.setup.target2 ) ],
				[ 'Target 3', '₹' + num( data.setup.target3 ) ],
				[ 'Risk:Reward', num( data.setup.risk_reward ) ],
				[ 'Holding', num( data.setup.holding ) ],
				[ 'ATR', num( data.setup.atr ) ]
			];
			tiles.forEach( function ( t ) {
				var tile = el( 'div', 'fnosp-tile' );
				tile.appendChild( el( 'div', 'k', esc( t[ 0 ] ) ) );
				tile.appendChild( el( 'div', 'v', esc( t[ 1 ] ) ) );
				grid.appendChild( tile );
			} );
			wrap.appendChild( grid );
		} else {
			wrap.appendChild( el( 'p', '', '<em>No high-probability trade. Confidence below threshold or risk filter triggered.</em>' ) );
		}

		// Score breakdown.
		if ( data.scores ) {
			wrap.appendChild( el( 'div', 'fnosp-section-title', 'Score Breakdown (100-pt framework)' ) );
			var table = el( 'table', 'fnosp-scores' );
			table.innerHTML = '<tr><th>Component</th><th>Points</th><th>Weight</th><th></th></tr>';
			Object.keys( data.scores ).forEach( function ( k ) {
				var sc = data.scores[ k ];
				var pct = sc.weight ? ( sc.points / sc.weight ) * 100 : 0;
				var row = el( 'tr' );
				row.innerHTML =
					'<td>' + esc( k.replace( /_/g, ' ' ) ) + '</td>' +
					'<td>' + esc( sc.points ) + '</td>' +
					'<td>' + esc( sc.weight ) + '</td>' +
					'<td><div class="fnosp-scorebar"><span style="width:' + pct.toFixed( 0 ) + '%"></span></div></td>';
				table.appendChild( row );
			} );
			wrap.appendChild( table );
		}

		// Probabilities.
		if ( data.probabilities ) {
			wrap.appendChild( el( 'div', 'fnosp-section-title', 'Probability Table' ) );
			var pg = el( 'div', 'fnosp-grid' );
			var probs = [
				[ 'Trend', data.probabilities.trend ],
				[ 'T1', data.probabilities.target1 ],
				[ 'T2', data.probabilities.target2 ],
				[ 'T3', data.probabilities.target3 ],
				[ 'SL Hit', data.probabilities.stop_loss_hit ]
			];
			probs.forEach( function ( p ) {
				var tile = el( 'div', 'fnosp-tile' );
				tile.appendChild( el( 'div', 'k', esc( p[ 0 ] ) ) );
				tile.appendChild( el( 'div', 'v', esc( p[ 1 ] ) ) );
				pg.appendChild( tile );
			} );
			wrap.appendChild( pg );
		}

		// Option strategy.
		if ( data.option_strategy && data.option_strategy.legs ) {
			wrap.appendChild( el( 'div', 'fnosp-section-title', 'Option Strategy (' + esc( data.option_strategy.primary ) + ')' ) );
			var ot = el( 'table', 'fnosp-scores' );
			ot.innerHTML = '<tr><th>Type</th><th>Strike</th><th>Premium</th><th>Prob.</th><th>Risk</th></tr>';
			data.option_strategy.legs.forEach( function ( leg ) {
				var r = el( 'tr' );
				r.innerHTML =
					'<td>' + esc( leg.type ) + '</td>' +
					'<td>' + esc( leg.strike ) + '</td>' +
					'<td>' + esc( leg.premium_range ) + '</td>' +
					'<td>' + esc( leg.probability ) + '</td>' +
					'<td>' + esc( leg.risk ) + '</td>';
				ot.appendChild( r );
			} );
			wrap.appendChild( ot );
		}

		// Analysis notes.
		if ( data.analysis ) {
			wrap.appendChild( el( 'div', 'fnosp-section-title', 'Analysis' ) );
			var ul = el( 'ul', 'fnosp-list' );
			Object.keys( data.analysis ).forEach( function ( k ) {
				ul.appendChild( el( 'li', '', '<strong>' + esc( k.replace( /_/g, ' ' ) ) + ':</strong> ' + esc( data.analysis[ k ] ) ) );
			} );
			wrap.appendChild( ul );
		}

		// Risk factors.
		if ( data.risk_factors && data.risk_factors.length ) {
			wrap.appendChild( el( 'div', 'fnosp-section-title', 'Risk Factors' ) );
			var rl = el( 'ul', 'fnosp-list' );
			data.risk_factors.forEach( function ( f ) {
				rl.appendChild( el( 'li', '', esc( f ) ) );
			} );
			wrap.appendChild( rl );
		}

		// Verdict.
		if ( data.final_verdict ) {
			wrap.appendChild( el( 'div', 'fnosp-verdict', esc( data.final_verdict ) ) );
		}

		// Plain-language summary.
		if ( data.layman_summary ) {
			wrap.appendChild( el( 'div', 'fnosp-section-title', 'In Simple Words' ) );
			var lay = el( 'div', 'fnosp-layman' );
			if ( data.layman_summary.headline ) {
				lay.appendChild( el( 'div', 'fnosp-layman-head', esc( data.layman_summary.headline ) ) );
			}
			if ( data.layman_summary.text ) {
				lay.appendChild( el( 'div', '', esc( data.layman_summary.text ) ) );
			}
			if ( data.layman_summary.steps && data.layman_summary.steps.length ) {
				var sl = el( 'ul', 'fnosp-list' );
				data.layman_summary.steps.forEach( function ( st ) {
					sl.appendChild( el( 'li', '', esc( st ) ) );
				} );
				lay.appendChild( sl );
			}
			wrap.appendChild( lay );
		}
		if ( data.ai && data.ai.narrative ) {
			wrap.appendChild( el( 'div', 'fnosp-section-title', 'AI Commentary (' + esc( data.ai.model ) + ')' ) );
			wrap.appendChild( el( 'div', 'fnosp-ai', esc( data.ai.narrative ) ) );
		} else if ( data.ai && data.ai.error ) {
			wrap.appendChild( el( 'div', 'fnosp-error', 'AI: ' + esc( data.ai.error ) ) );
		}

		// Per-strike option plan.
		if ( data.option_plan ) {
			var op = data.option_plan;
			wrap.appendChild( el( 'div', 'fnosp-section-title', 'Option Plan — ' + esc( op.label ) + ' (' + esc( op.moneyness ) + ', ' + esc( op.dte ) + 'd, IV ' + esc( op.iv_used ) + '%)' ) );
			var box = el( 'div', 'fnosp-layman' );

			box.appendChild( el( 'div', '', '<strong>Now:</strong> ' + esc( op.premium_source || 'estimate' ) + ' premium ≈ ₹' + esc( op.premium_now ) + ' · delta ' + esc( op.delta ) + ( op.aligned ? ' · <span style="color:#14794a">aligned with signal</span>' : ' · <span style="color:#b32424">counter-trend</span>' ) ) );

			if ( op.buy_when ) {
				box.appendChild( el( 'div', 'fnosp-layman-head', 'When to BUY' ) );
				box.appendChild( el( 'div', '', esc( op.buy_when.condition ) + '<br>Entry zone: ' + esc( op.buy_when.entry_zone ) + '<br>Est. buy premium: ' + esc( op.buy_when.est_premium ) ) );
			}

			if ( op.sell_when ) {
				box.appendChild( el( 'div', 'fnosp-layman-head', 'When to SELL' ) );
				var st = el( 'table', 'fnosp-scores' );
				st.innerHTML = '<tr><th>Target (underlying)</th><th>Est. premium</th><th></th></tr>';
				op.sell_when.targets.forEach( function ( tg ) {
					var row = el( 'tr' );
					row.innerHTML = '<td>' + esc( tg.spot ) + '</td><td>₹' + esc( tg.premium ) + '</td><td>' + esc( tg.note ) + '</td>';
					st.appendChild( row );
				} );
				box.appendChild( st );
				if ( op.sell_when.stop_loss ) {
					box.appendChild( el( 'div', '', '<strong>Stop:</strong> ' + esc( op.sell_when.stop_loss.note ) ) );
				}
				if ( op.sell_when.time_exit ) {
					box.appendChild( el( 'div', '', '<strong>Time exit:</strong> ' + esc( op.sell_when.time_exit ) ) );
				}
			}
			wrap.appendChild( box );
		}

		// Data coverage notes (free provider transparency).
		if ( data.data_notes && data.data_notes.length ) {
			wrap.appendChild( el( 'div', 'fnosp-section-title', 'Data Coverage' ) );
			var dn = el( 'ul', 'fnosp-list' );
			data.data_notes.forEach( function ( n ) {
				dn.appendChild( el( 'li', '', esc( n ) ) );
			} );
			wrap.appendChild( dn );
		}

		// Expert Advice footer (plain-language, prominent).
		if ( data.expert_advice ) {
			var adv = el( 'div', 'fnosp-expert' );
			adv.appendChild( el( 'div', 'fnosp-expert-head', '🧑‍🏫 Expert Advice (in simple words)' ) );
			adv.appendChild( el( 'div', '', esc( data.expert_advice ) ) );
			wrap.appendChild( adv );
		}

		// Meta + disclaimer.
		var meta = 'Source: ' + esc( data.source ) + ( data.cached ? ' (cached)' : '' ) + ' · ' + esc( data.generated_at );
		wrap.appendChild( el( 'div', 'fnosp-disclaimer', meta + '<br>' + esc( data.disclaimer ) ) );

		return wrap;
	}

	function tvSymbol( sym ) {
		var m = {
			NIFTY: 'NSE:NIFTY',
			NIFTY50: 'NSE:NIFTY',
			BANKNIFTY: 'NSE:BANKNIFTY',
			FINNIFTY: 'NSE:CNXFINANCE',
			MIDCPNIFTY: 'NSE:NIFTYMIDSELECT',
			SENSEX: 'BSE:SENSEX'
		};
		sym = ( sym || '' ).toUpperCase();
		if ( m[ sym ] ) { return m[ sym ]; }
		if ( sym.indexOf( ':' ) !== -1 ) { return sym; }
		return 'NSE:' + sym;
	}

	var fnospTvWidget = null;
	function renderChart( sym ) {
		var holder = document.getElementById( 'fnosp-tvchart' );
		if ( ! holder || typeof TradingView === 'undefined' ) { return; }
		holder.innerHTML = '';
		try {
			fnospTvWidget = new TradingView.widget( {
				autosize: true,
				symbol: tvSymbol( sym ),
				interval: '15',
				timezone: 'Asia/Kolkata',
				theme: ( FNOSP_ADMIN.chartTheme === 'dark' ? 'dark' : 'light' ),
				style: '1',
				locale: 'en',
				container_id: 'fnosp-tvchart',
				hide_side_toolbar: false,
				allow_symbol_change: true,
				studies: [ 'STD;EMA', 'RSI@tv-basicstudies' ]
			} );
		} catch ( e ) {
			holder.innerHTML = '<p class="fnosp-error">Chart could not load.</p>';
		}
	}

	function fetchSignal() {
		var instrument = document.getElementById( 'fnosp-instrument' ).value;
		var useAi = document.getElementById( 'fnosp-use-ai' ).checked ? 1 : 0;
		var nocache = document.getElementById( 'fnosp-nocache' ).checked ? 1 : 0;
		var out = document.getElementById( 'fnosp-result' );

		out.innerHTML = '';
		out.appendChild( el( 'p', 'fnosp-loading', FNOSP_ADMIN.i18n.loading ) );

		var url = FNOSP_ADMIN.restUrl +
			'?instrument=' + encodeURIComponent( instrument ) +
			'&ai=' + useAi + '&nocache=' + nocache;

		// Optional per-strike option plan.
		var strikeEl = document.getElementById( 'fnosp-strike' );
		var strike = strikeEl ? strikeEl.value : '';
		if ( strike && parseFloat( strike ) > 0 ) {
			var ot = document.getElementById( 'fnosp-opt-type' ).value;
			var dte = document.getElementById( 'fnosp-dte' ).value || 7;
			url += '&strike=' + encodeURIComponent( strike ) + '&opt_type=' + encodeURIComponent( ot ) + '&dte=' + encodeURIComponent( dte );
			var expEl = document.getElementById( 'fnosp-expiry' );
			var exp = expEl ? expEl.value : '';
			if ( exp ) {
				url += '&expiry=' + encodeURIComponent( exp );
			}
			var premEl = document.getElementById( 'fnosp-premium' );
			var prem = premEl ? premEl.value : '';
			if ( prem && parseFloat( prem ) > 0 ) {
				url += '&premium=' + encodeURIComponent( prem );
			}
		}

		fetch( url, {
			headers: { 'X-WP-Nonce': FNOSP_ADMIN.nonce },
			credentials: 'same-origin'
		} )
			.then( function ( r ) { return r.json().then( function ( j ) { return { ok: r.ok, body: j }; } ); } )
			.then( function ( res ) {
				out.innerHTML = '';
				if ( ! res.ok ) {
					var msg = res.body && res.body.message ? res.body.message : FNOSP_ADMIN.i18n.error;
					out.appendChild( el( 'p', 'fnosp-error', esc( msg ) ) );
					return;
				}
				out.appendChild( renderSignal( res.body ) );
			} )
			.catch( function () {
				out.innerHTML = '';
				out.appendChild( el( 'p', 'fnosp-error', FNOSP_ADMIN.i18n.error ) );
			} );
	}

	document.addEventListener( 'DOMContentLoaded', function () {
		var btn = document.getElementById( 'fnosp-generate' );
		if ( btn ) {
			btn.addEventListener( 'click', fetchSignal );
		}

		// Live chart: render on load and when the instrument changes.
		var instEl = document.getElementById( 'fnosp-instrument' );
		if ( document.getElementById( 'fnosp-tvchart' ) && instEl ) {
			renderChart( instEl.value );
			instEl.addEventListener( 'change', function () { renderChart( instEl.value ); } );
		}

		// Auto-fill days-to-expiry when an expiry date is chosen.
		var expEl = document.getElementById( 'fnosp-expiry' );
		var dteEl = document.getElementById( 'fnosp-dte' );
		if ( expEl && dteEl ) {
			expEl.addEventListener( 'change', function () {
				if ( ! expEl.value ) { return; }
				var diff = Math.ceil( ( new Date( expEl.value ).getTime() - Date.now() ) / 86400000 );
				if ( diff >= 1 ) { dteEl.value = diff; }
			} );
		}

		var tgBtn = document.getElementById( 'fnosp-tg-test' );
		if ( tgBtn ) {
			tgBtn.addEventListener( 'click', function () {
				runTest( tgBtn, FNOSP_ADMIN.tgTestUrl, 'fnosp-tg-test-result' );
			} );
		}

		var emailBtn = document.getElementById( 'fnosp-email-test' );
		if ( emailBtn ) {
			emailBtn.addEventListener( 'click', function () {
				runTest( emailBtn, FNOSP_ADMIN.emailTestUrl, 'fnosp-email-test-result' );
			} );
		}

		var scanBtn = document.getElementById( 'fnosp-scan' );
		if ( scanBtn ) {
			scanBtn.addEventListener( 'click', runScan );
		}
	} );

	function pickRow( x ) {
		var s = x.setup;
		var lvls = s ? ( ' · Entry ₹' + x.setup.entry_low + '–₹' + x.setup.entry_high + ' · SL ₹' + s.stop_loss + ' · T ₹' + s.target1 + '/₹' + s.target2 ) : '';
		return '<li><strong>' + esc( x.instrument ) + '</strong> @ ₹' + esc( x.ltp ) + ' — <strong>' + esc( x.confidence ) + '%</strong> (' + esc( x.trend ) + ')' + esc( lvls ) + '</li>';
	}

	function runScan() {
		var btn = document.getElementById( 'fnosp-scan' );
		var out = document.getElementById( 'fnosp-scan-result' );
		btn.disabled = true;
		out.innerHTML = '<p class="fnosp-loading">Scanning stocks… this can take 20–40s on first run.</p>';

		fetch( FNOSP_ADMIN.scanUrl, {
			headers: { 'X-WP-Nonce': FNOSP_ADMIN.nonce },
			credentials: 'same-origin'
		} )
			.then( function ( r ) { return r.json().then( function ( j ) { return { ok: r.ok, body: j }; } ); } )
			.then( function ( res ) {
				btn.disabled = false;
				if ( ! res.ok ) {
					out.innerHTML = '<p class="fnosp-error">' + esc( res.body && res.body.message ? res.body.message : 'Scan failed.' ) + '</p>';
					return;
				}
				var d = res.body;
				var html = '<div class="fnosp-card">';
				html += '<div class="fnosp-card-head"><strong>Today\'s Top Picks</strong><span class="fnosp-conf">Scanned ' + esc( d.scanned ) + ' · min ' + esc( d.min_confidence ) + '% · ' + ( d.market_open ? 'market open' : 'market closed' ) + ( d.cached ? ' · cached' : '' ) + '</span></div>';

				html += '<div class="fnosp-section-title" style="color:#14794a">BUY candidates (' + d.buy.length + ')</div>';
				html += d.buy.length ? ( '<ul class="fnosp-list">' + d.buy.map( pickRow ).join( '' ) + '</ul>' ) : '<p><em>No high-confidence BUY today.</em></p>';

				html += '<div class="fnosp-section-title" style="color:#b32424">SELL candidates (' + d.sell.length + ')</div>';
				html += d.sell.length ? ( '<ul class="fnosp-list">' + d.sell.map( pickRow ).join( '' ) + '</ul>' ) : '<p><em>No high-confidence SELL today.</em></p>';

				html += '<div class="fnosp-disclaimer">' + esc( d.disclaimer ) + ' · ' + esc( d.generated_at ) + '</div>';
				html += '</div>';
				out.innerHTML = html;
			} )
			.catch( function () {
				btn.disabled = false;
				out.innerHTML = '<p class="fnosp-error">Scan failed (network/timeout). Try again.</p>';
			} );
	}

	function runTest( btn, url, resultId ) {
		var out = document.getElementById( resultId );
		btn.disabled = true;
		out.textContent = FNOSP_ADMIN.i18n.tgSending;
		out.className = '';
		fetch( url, {
			method: 'POST',
			headers: { 'X-WP-Nonce': FNOSP_ADMIN.nonce },
			credentials: 'same-origin'
		} )
			.then( function ( r ) { return r.json().then( function ( j ) { return { ok: r.ok, body: j }; } ); } )
			.then( function ( res ) {
				btn.disabled = false;
				if ( res.ok && res.body && res.body.ok ) {
					out.textContent = '✓ ' + ( res.body.message || FNOSP_ADMIN.i18n.tgSent );
					out.className = 'fnosp-tg-ok';
				} else {
					var msg = res.body && res.body.message ? res.body.message : FNOSP_ADMIN.i18n.tgError;
					out.textContent = '✗ ' + msg;
					out.className = 'fnosp-tg-err';
				}
			} )
			.catch( function () {
				btn.disabled = false;
				out.textContent = '✗ ' + FNOSP_ADMIN.i18n.tgError;
				out.className = 'fnosp-tg-err';
			} );
	}
} )();
