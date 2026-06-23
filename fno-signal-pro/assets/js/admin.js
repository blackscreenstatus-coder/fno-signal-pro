/* global FNOSP_ADMIN, TradingView */
( function () {
	'use strict';

	// --- Helpers ---
	function el( tag, cls, html ) { var n = document.createElement( tag ); if ( cls ) n.className = cls; if ( html !== undefined ) n.innerHTML = html; return n; }
	function esc( s ) { var d = document.createElement( 'div' ); d.textContent = ( s == null ) ? '' : String( s ); return d.innerHTML; }
	function num( v ) { return ( v == null || v === '' ) ? '-' : v; }
	function badgeClass( s ) { return s === 'BUY' ? 'buy' : ( s === 'SELL' ? 'sell' : 'notrade' ); }

	// --- TradingView symbol mapping ---
	function tvSymbol( sym ) {
		var m = { NIFTY:'NSE:NIFTY', NIFTY50:'NSE:NIFTY', BANKNIFTY:'NSE:BANKNIFTY', FINNIFTY:'NSE:CNXFINANCE', MIDCPNIFTY:'NSE:NIFTYMIDSELECT', SENSEX:'BSE:SENSEX' };
		sym = ( sym || '' ).toUpperCase();
		return m[ sym ] || ( sym.indexOf( ':' ) !== -1 ? sym : 'NSE:' + sym );
	}

	// Build a TradingView symbol for an F&O strike (e.g. "NSE:BANKNIFTY25JUNFUT" or nearest option).
	// TradingView free doesn't have individual option contracts, so we show the Futures contract or underlying.
	function tvFnoSymbol( instrument, optionPlan ) {
		// TradingView free tier doesn't support individual NSE option strikes (23550CE etc).
		// Best we can do: show the futures contract for the instrument.
		var m = { NIFTY:'NSE:NIFTY1!', NIFTY50:'NSE:NIFTY1!', BANKNIFTY:'NSE:BANKNIFTY1!', FINNIFTY:'NSE:CNXFINANCE', MIDCPNIFTY:'NSE:NIFTYMIDSELECT', SENSEX:'BSE:SENSEX' };
		var sym = ( instrument || '' ).toUpperCase();
		if ( m[ sym ] ) return m[ sym ];
		// For stocks, show the stock futures (continuous contract).
		return 'NSE:' + sym + '1!';
	}

	var currentChartSym = '';
	function renderChart( sym, optionPlan ) {
		var h = document.getElementById( 'fnosp-tvchart' );
		if ( !h || typeof TradingView === 'undefined' ) return;
		var newSym = tvFnoSymbol( sym, optionPlan );
		if ( newSym === currentChartSym ) return; // Don't re-render same chart.
		currentChartSym = newSym;
		h.innerHTML = '';
		try { new TradingView.widget({ autosize:true, symbol:newSym, interval:'15', timezone:'Asia/Kolkata', theme:FNOSP_ADMIN.chartTheme==='dark'?'dark':'light', style:'1', locale:'en', container_id:'fnosp-tvchart', hide_side_toolbar:false, allow_symbol_change:true, studies:['STD;EMA','RSI@tv-basicstudies'] }); } catch(e){}
	}

	// --- Main signal renderer ---
	function renderSignal( data ) {
		var wrap = el( 'div', 'fnosp-card' );

		// Signal header
		var head = el( 'div', 'fnosp-card-head' );
		head.innerHTML = '<span class="fnosp-badge ' + badgeClass(data.signal) + '">' + esc(data.signal) + '</span>'
			+ ' <strong>' + esc(data.instrument) + '</strong> @ ₹' + esc(data.ltp)
			+ '<span class="fnosp-conf">Confidence <strong>' + esc(data.confidence) + '%</strong> · ' + esc(data.trend_label) + '</span>'
			+ '<span class="fnosp-locked-badge">🔒 Levels locked</span>';
		wrap.appendChild( head );

		// Confidence meter
		var meter = el( 'div', 'fnosp-meter' );
		meter.innerHTML = '<span style="width:' + Math.min(100, data.confidence) + '%"></span>';
		wrap.appendChild( meter );

		// ⚡ AUTO RECOMMENDED STRIKE (prominent, no manual input)
		if ( data.option_plan ) {
			var op = data.option_plan;
			var rec = el( 'div', 'fnosp-rec' );
			rec.innerHTML = '<div class="fnosp-rec-title">⚡ Recommended: ' + esc(op.label) + ' — ' + esc(op.moneyness) + ' (delta ' + esc(op.delta) + ')</div>';

			var grid = el( 'div', 'fnosp-grid' );
			var cells = [
				['Entry Premium', '₹' + num(op.premium_now)],
				['IV / Expiry', num(op.iv_used) + '% / ' + num(op.dte) + ' days']
			];
			if ( op.sell_when && op.sell_when.targets ) {
				var tg = op.sell_when.targets;
				cells.push(['T1 (book ⅓)', '₹' + num(tg[0].premium) + ' ← spot ' + num(tg[0].spot)]);
				cells.push(['T2 (book ⅓)', '₹' + num(tg[1].premium) + ' ← spot ' + num(tg[1].spot)]);
				cells.push(['T3 (trail)', '₹' + num(tg[2].premium) + ' ← spot ' + num(tg[2].spot)]);
			}
			if ( op.sell_when && op.sell_when.stop_loss ) {
				cells.push(['🛑 Stop Loss', '₹' + num(op.sell_when.stop_loss.premium) + ' ← spot ' + num(op.sell_when.stop_loss.spot)]);
			}
			cells.forEach(function(c){ var t=el('div','fnosp-tile'); t.innerHTML='<div class="k">'+esc(c[0])+'</div><div class="v">'+esc(c[1])+'</div>'; grid.appendChild(t); });
			rec.appendChild( grid );
			rec.appendChild( el('div','fnosp-rec-cond','📌 '+esc(op.buy_when.condition)) );
			if ( op.sell_when && op.sell_when.time_exit ) rec.appendChild( el('div','fnosp-rec-cond','⏱ '+esc(op.sell_when.time_exit)) );
			wrap.appendChild( rec );
		}

		// 📊 CALL & PUT SIGNALS — always shown side by side
		if ( data.call_plan || data.put_plan ) {
			var cpWrap = el( 'div', 'fnosp-cp-wrap' );
			cpWrap.appendChild( el( 'div', 'fnosp-section-title', '📊 F&O Strike Price — Call & Put Signals' ) );
			var cpGrid = el( 'div', 'fnosp-cp-grid' );

			if ( data.call_plan ) {
				var cp = data.call_plan;
				var cBox = el( 'div', 'fnosp-cp-box fnosp-cp-call' );
				cBox.innerHTML = '<div class="fnosp-cp-head">🟢 CALL (CE)</div>'
					+ '<div class="fnosp-cp-strike">' + esc(cp.label) + '</div>'
					+ '<div class="fnosp-cp-row">Entry: <strong>₹' + num(cp.premium_now) + '</strong></div>'
					+ ( cp.sell_when && cp.sell_when.targets ? '<div class="fnosp-cp-row">T1 ₹' + num(cp.sell_when.targets[0].premium) + ' · T2 ₹' + num(cp.sell_when.targets[1].premium) + ' · T3 ₹' + num(cp.sell_when.targets[2].premium) + '</div>' : '' )
					+ ( cp.sell_when && cp.sell_when.stop_loss ? '<div class="fnosp-cp-row">SL ₹' + num(cp.sell_when.stop_loss.premium) + '</div>' : '' )
					+ '<div class="fnosp-cp-cond">' + esc(cp.buy_when.condition) + '</div>';
				cpGrid.appendChild( cBox );
			}
			if ( data.put_plan ) {
				var pp = data.put_plan;
				var pBox = el( 'div', 'fnosp-cp-box fnosp-cp-put' );
				pBox.innerHTML = '<div class="fnosp-cp-head">🔴 PUT (PE)</div>'
					+ '<div class="fnosp-cp-strike">' + esc(pp.label) + '</div>'
					+ '<div class="fnosp-cp-row">Entry: <strong>₹' + num(pp.premium_now) + '</strong></div>'
					+ ( pp.sell_when && pp.sell_when.targets ? '<div class="fnosp-cp-row">T1 ₹' + num(pp.sell_when.targets[0].premium) + ' · T2 ₹' + num(pp.sell_when.targets[1].premium) + ' · T3 ₹' + num(pp.sell_when.targets[2].premium) + '</div>' : '' )
					+ ( pp.sell_when && pp.sell_when.stop_loss ? '<div class="fnosp-cp-row">SL ₹' + num(pp.sell_when.stop_loss.premium) + '</div>' : '' )
					+ '<div class="fnosp-cp-cond">' + esc(pp.buy_when.condition) + '</div>';
				cpGrid.appendChild( pBox );
			}
			cpWrap.appendChild( cpGrid );
			wrap.appendChild( cpWrap );
		}

		// Expert Advice footer
		if ( data.expert_advice ) {
			var adv = el('div','fnosp-expert');
			adv.innerHTML = '<div class="fnosp-expert-head">🧑‍🏫 Expert Advice</div>' + esc(data.expert_advice);
			wrap.appendChild( adv );
		}

		// Meta
		wrap.appendChild( el('div','fnosp-disclaimer', esc(data.source) + (data.cached?' (cached)':'') + ' · ' + esc(data.generated_at) + '<br>' + esc(data.disclaimer)) );
		return wrap;
	}

	// --- Fetch + render signal ---
	var currentSym = '';
	var refreshTimer = null;
	var lockedSignal = null; // Stores the LOCKED signal so levels don't fluctuate.

	function fetchSignal( sym, silent ) {
		currentSym = sym || currentSym;
		var out = document.getElementById( 'fnosp-result' );
		if ( !silent ) { out.innerHTML = '<p class="fnosp-loading">' + FNOSP_ADMIN.i18n.loading + '</p>'; lockedSignal = null; }

		var url = FNOSP_ADMIN.restUrl + '?instrument=' + encodeURIComponent(currentSym) + '&nocache=1';
		fetch( url, { headers:{'X-WP-Nonce':FNOSP_ADMIN.nonce}, credentials:'same-origin' })
			.then(function(r){
				var ct = r.headers.get('content-type') || '';
				if ( ct.indexOf('json') === -1 ) {
					return { ok:false, body:{ message:'Server returned non-JSON (HTTP ' + r.status + '). Try switching to Demo mode in Settings.' } };
				}
				return r.json().then(function(j){return {ok:r.ok,body:j};});
			})
			.then(function(res){
				if ( !res.ok ) { out.innerHTML = '<p class="fnosp-error">Error: ' + esc(res.body&&res.body.message?res.body.message:'Could not generate signal.') + '</p>'; return; }

				var data = res.body;

				// LOCK LOGIC: Only update the displayed signal if:
				// 1. No locked signal yet (first load), OR
				// 2. The direction has CHANGED (BUY->SELL, SELL->NO TRADE, etc.), OR
				// 3. User manually switched instrument (silent=false on first call).
				if ( !lockedSignal || lockedSignal.signal !== data.signal || lockedSignal.instrument !== data.instrument ) {
					lockedSignal = data;
				} else {
					// Direction same — only update LTP (live price), keep T1/T2/T3/SL locked.
					lockedSignal.ltp = data.ltp;
					lockedSignal.confidence = data.confidence;
					lockedSignal.generated_at = data.generated_at;
				}

				out.innerHTML = '';
				out.appendChild( renderSignal( lockedSignal ) );

				// Update chart to show futures of the recommended strike's instrument.
				if ( document.getElementById('fnosp-tvchart') ) {
					renderChart( lockedSignal.instrument, lockedSignal.option_plan );
				}

				// Pulse the live dot.
				var dot = document.getElementById('fnosp-live-dot');
				if (dot) { dot.classList.remove('pulse'); void dot.offsetWidth; dot.classList.add('pulse'); }
			})
			.catch(function(e){ if(!silent) out.innerHTML = '<p class="fnosp-error">Network error: ' + esc(String(e)) + '</p>'; });
	}

	function startAutoRefresh() {
		if ( refreshTimer ) clearInterval( refreshTimer );
		refreshTimer = setInterval( function(){ fetchSignal( null, true ); }, 5000 );
	}

	// --- Scanner (Top Picks with full details) ---
	function renderPick( x ) {
		var s = x.setup;
		var html = '<div class="fnosp-pick">';
		html += '<span class="fnosp-badge ' + badgeClass(x.signal) + ' fnosp-badge-sm">' + esc(x.signal) + '</span>';
		html += ' <strong>' + esc(x.instrument) + '</strong>';
		html += ' <span class="fnosp-pick-conf">' + esc(x.confidence) + '% · ' + esc(x.trend) + '</span>';
		html += ' @ ₹' + esc(x.ltp);
		if ( s ) {
			html += '<div class="fnosp-pick-levels">';
			html += 'Entry ₹' + esc(s.entry_low) + '–₹' + esc(s.entry_high);
			html += ' · SL ₹' + esc(s.stop_loss);
			html += ' · T1 ₹' + esc(s.target1) + ' · T2 ₹' + esc(s.target2);
			html += '</div>';
		}
		if ( x.headline ) html += '<div class="fnosp-pick-advice">' + esc(x.headline) + '</div>';
		html += '</div>';
		return html;
	}

	function loadScan() {
		var out = document.getElementById( 'fnosp-scan-result' );
		fetch( FNOSP_ADMIN.scanUrl, { headers:{'X-WP-Nonce':FNOSP_ADMIN.nonce}, credentials:'same-origin' })
			.then(function(r){
				var ct = r.headers.get('content-type') || '';
				if ( ct.indexOf('json') === -1 ) {
					return { ok:false, body:{ message:'Server returned non-JSON (HTTP ' + r.status + '). Scanner may have timed out.' } };
				}
				return r.json().then(function(j){return {ok:r.ok,body:j};});
			})
			.then(function(res){
				if ( !res.ok ) { out.innerHTML = '<p class="fnosp-error">Scan failed. Try again in a moment.</p>'; return; }
				var d = res.body;
				var html = '<div class="fnosp-scan-meta">Scanned ' + esc(d.scanned) + ' symbols · VIX ' + esc(d.macro.vix) + ' · FII ' + (d.macro.fii_net>=0?'+':'') + esc(d.macro.fii_net) + ' Cr</div>';

				html += '<div class="fnosp-section-title" style="color:#14794a">🟢 BUY (' + d.buy.length + ')</div>';
				if ( d.buy.length ) { d.buy.forEach(function(x){ html += renderPick(x); }); }
				else { html += '<p class="fnosp-muted">No high-confidence BUY today.</p>'; }

				html += '<div class="fnosp-section-title" style="color:#b32424">🔴 SELL (' + d.sell.length + ')</div>';
				if ( d.sell.length ) { d.sell.forEach(function(x){ html += renderPick(x); }); }
				else { html += '<p class="fnosp-muted">No high-confidence SELL today.</p>'; }

				html += '<div class="fnosp-disclaimer">' + esc(d.disclaimer) + '</div>';
				out.innerHTML = html;
			})
			.catch(function(){ out.innerHTML = '<p class="fnosp-error">Scan failed (timeout/network). Refresh page to retry.</p>'; });
	}

	// --- Stock search ---
	function doSearch() {
		var input = document.getElementById('fnosp-search');
		var val = (input.value || '').trim().toUpperCase();
		if ( !val ) return;
		lockedSignal = null; // Reset lock for new search.
		fetchSignal( val, false );
		input.value = '';
	}

	// --- Telegram/Email test helper ---
	function runTest( btn, url, resultId ) {
		var out = document.getElementById( resultId );
		btn.disabled = true; out.textContent = FNOSP_ADMIN.i18n.tgSending; out.className = '';
		fetch( url, { method:'POST', headers:{'X-WP-Nonce':FNOSP_ADMIN.nonce}, credentials:'same-origin' })
			.then(function(r){ return r.json().then(function(j){return {ok:r.ok,body:j};}); })
			.then(function(res){ btn.disabled=false; if(res.ok&&res.body&&res.body.ok){out.textContent='✓ '+(res.body.message||'Sent');out.className='fnosp-tg-ok';}else{out.textContent='✗ '+(res.body&&res.body.message?res.body.message:'Failed');out.className='fnosp-tg-err';}})
			.catch(function(){ btn.disabled=false; out.textContent='✗ Failed'; out.className='fnosp-tg-err'; });
	}

	// --- Init ---
	document.addEventListener( 'DOMContentLoaded', function () {
		var instEl = document.getElementById( 'fnosp-instrument' );
		currentSym = instEl ? instEl.value : 'NIFTY';

		// Initial load
		fetchSignal( currentSym, false );
		startAutoRefresh();

		// Chart — will be rendered/updated by fetchSignal after data arrives.

		// Instrument change
		if ( instEl ) {
			instEl.addEventListener( 'change', function() {
				lockedSignal = null; // Reset lock on instrument change.
				fetchSignal( instEl.value, false );
			});
		}

		// Stock search
		var searchBtn = document.getElementById('fnosp-search-go');
		var searchInput = document.getElementById('fnosp-search');
		if ( searchBtn ) searchBtn.addEventListener( 'click', doSearch );
		if ( searchInput ) searchInput.addEventListener( 'keydown', function(e){ if(e.key==='Enter'){e.preventDefault();doSearch();} });

		// Today's Top Picks (auto-load)
		loadScan();

		// Telegram/Email test buttons (settings page)
		var tgBtn = document.getElementById('fnosp-tg-test');
		if ( tgBtn ) tgBtn.addEventListener('click', function(){ runTest(tgBtn, FNOSP_ADMIN.tgTestUrl, 'fnosp-tg-test-result'); });
		var emailBtn = document.getElementById('fnosp-email-test');
		if ( emailBtn ) emailBtn.addEventListener('click', function(){ runTest(emailBtn, FNOSP_ADMIN.emailTestUrl, 'fnosp-email-test-result'); });
	});
})();
