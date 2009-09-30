/******************************************************************/
/* This is a modified version designed to be compatible with      */
/* Mootools 1.2. Please see:                                      */
/* http://forum.e-magine.ro/topic/moodal-box-with-mootools-12     */
/******************************************************************/
/* Modified by Rhydian Roberts: www.voidsystems.co.uk/moodalbox   */
/******************************************************************/
/******************************************************************/
/* Added new features:                                            */
/*     - config() support                                         */
/*     - callBack support                                         */
/* Simon Cornelius P. Umacob http://www.simoncpu.com              */
/******************************************************************/

/******************************************************************/
/*                        MOOdalBox 1.2.1                         */
/* A modal box (inline popup), used to display remote content     */
/* loaded using AJAX, written for the mootools framework          */
/*         by Razvan Brates, razvan [at] e-magine.ro              */
/******************************************************************/
/*               http://www.e-magine.ro/moodalbox                 */
/******************************************************************/
/*                                                                */
/* MIT style license:                                             */
/* http://en.wikipedia.org/wiki/MIT_License                       */
/*                                                                */
/* mootools found at:                                             */
/* http://mootools.net/                                           */
/*                                                                */
/* Original code based on "Slimbox", by Christophe Beyls:         */
/* http://www.digitalia.be/software/slimbox                       */
/******************************************************************/

// Constants defined here can be changed for easy config / translation
// (defined as vars, because of MSIE's lack of support for const)

var _ERROR_MESSAGE = "Oops.. there was a problem with your request.<br /><br />" +
					"Please try again.<br /><br />" +
					"<em>Click anywhere to close.</em>"; // the error message displayed when the request has a problem
var _RESIZE_DURATION 		= 400; 		// Duration of height and width resizing (ms)
var _INITIAL_WIDTH			= 250;		// Initial width of the box (px)
var _INITIAL_HEIGHT			= 250;		// Initial height of the box (px)
var _CONTENTS_WIDTH 		= 500;		// Actual width of the box (px)
var _CONTENTS_HEIGHT		= 400;		// Actual height of the box (px)
var _DEF_CONTENTS_WIDTH		= 500;		// Default width of the box (px) - used for resetting when a different setting was used
var _DEF_CONTENTS_HEIGHT	= 400;		// Default height of the box (px) - used for resetting when a different setting was used
var _ANIMATE_CAPTION		= true;		// Enable/Disable caption animation
var _EVAL_SCRIPTS			= false;	// Option to evaluate scripts in the response text
var _EVAL_RESPONSE			= false;	// Option to evaluate the whole response text

// The MOOdalBox object in its beauty
var MOOdalBox = {
	
	// init the MOOdalBox
	init: function (options) {
		
		this.config(options);
		
		// scan anchors for those opening a MOOdalBox
		this.anchors = [];
		$A($$('a')).each(function(el){
			// we use a regexp to check for links that 
			// have a rel attribute starting with "moodalbox"
			if(el.rel && el.href && el.rel.test('^moodalbox', 'i')) {
				el.onclick = this.click.pass(el, this);
				this.anchors.push(el);
			}
		}, this);
		
		// add event listeners
		this.eventKeyDown = this.keyboardListener.bindWithEvent(this);
		this.eventPosition = this.position.bind(this);
		
		// init the HTML elements
		// the overlay (clickable to close)
		this.overlay = new Element('div').setProperty('id', 'mb_overlay').injectInside(document.body);
		// the center element
		this.center = new Element('div').setProperty('id', 'mb_center').setStyles({width: this.options.initialWidth+'px', height: this.options.initialHeight+'px', marginLeft: '-'+(this.options.initialWidth/2)+'px', display: 'none'}).injectInside(document.body);
		// the actual page contents
		this.contents = new Element('div').setProperty('id', 'mb_contents').injectInside(this.center);

		// the bottom part (caption / close)
		this.bottom = new Element('div').setProperty('id', 'mb_bottom').setStyle('display', 'none').injectInside(document.body);
		this.closelink = new Element('a').setProperties({id: 'mb_close_link', href: '#'}).injectInside(this.bottom);
		this.caption = new Element('div').setProperty('id', 'mb_caption').injectInside(this.bottom);
		new Element('div').setStyle('clear', 'both').injectInside(this.bottom);
		
		this.error = new Element('div').setProperty('id', 'mb_error').set('html',_ERROR_MESSAGE);
		
		// attach the close event to the close button / the overlay
		this.closelink.onclick = this.overlay.onclick = this.close.bind(this);
		
		// init the effects
		var nextEffect = this.nextEffect.bind(this);
		this.fx = {
			overlay:	new Fx.Tween(this.overlay, {property: "opacity", duration: 500}).set(0),
			resize:		new Fx.Morph(this.center, $extend({duration: this.options.resizeDuration, onComplete: nextEffect}, this.options.resizeTransition ? {transition: this.options.resizeTransition} : {})),
			contents:	new Fx.Tween(this.contents, {property: "opacity", duration: 500, onComplete: nextEffect}),
			bottom:		new Fx.Morph(this.bottom, $extend({duration: 400, onComplete: nextEffect}, this.options.resizeTransition ? {transition: this.options.resizeTransition} : {}))
		};
		
		this.ajaxRequest = Class.empty;

	},
	
	config: function(options) {
		// init default options
		if (!$defined(this.options)) {
			this.options = new Hash({
				resizeDuration: 	_RESIZE_DURATION,
				initialWidth: 		_INITIAL_WIDTH,	
				initialHeight: 		_INITIAL_HEIGHT,
				contentsWidth: 		_CONTENTS_WIDTH,
				contentsHeight: 	_CONTENTS_HEIGHT,
				defContentsWidth: 	_DEF_CONTENTS_WIDTH,
				defContentsHeight: 	_DEF_CONTENTS_HEIGHT,
				animateCaption: 	_ANIMATE_CAPTION,
				evalScripts: 		_EVAL_SCRIPTS,
				evalResponse: 		_EVAL_RESPONSE,
				callBack:               function() { return true; }
			});
		};

		this.options.extend(options);
	},

	click: function(link) {
		return this.open (link.href, link.title, link.rel);
	},

	open: function(sLinkHref, sLinkTitle, sLinkRel) {
		this.href = sLinkHref;
		this.title = sLinkTitle;
		this.rel = sLinkRel;
		this.position();
		this.setup(true);
		this.top = Window.getScrollTop() + (Window.getHeight() / 15);
		this.center.setStyles({top: this.top+'px', display: ''});
		this.fx.overlay.start(0.8);
		return this.loadContents(sLinkHref);
	},

	position: function() {
		this.overlay.setStyles({top: Window.getScrollTop()+'px', height: Window.getHeight()+'px'});
	},

	setup: function(open) {
		var elements = $A($$('object'));
		elements.extend($$(window.ActiveXObject ? 'select' : 'embed'));
		elements.each(function(el){ el.style.visibility = open ? 'hidden' : ''; });
		var fn = open ? 'addEvent' : 'removeEvent';
		window[fn]('scroll', this.eventPosition)[fn]('resize', this.eventPosition);
		document[fn]('keydown', this.eventKeyDown);
		this.step = 0;
	},
	
	loadContents: function() {		
		if(this.step) return false;
		this.step = 1;
		
		// check to see if there are specified dimensions
		// if not, fall back to default values
		var aDim = this.rel.match(/[0-9]+/g);
		this.options.contentsWidth = (aDim && (aDim[0] > 0)) ? aDim[0] : this.options.defContentsWidth;
		this.options.contentsHeight = (aDim && (aDim[1] > 0)) ? aDim[1] : this.options.defContentsHeight;
		
		this.bottom.setStyles({opacity: '0', height: '0px', display: 'none'});
		this.center.className = 'mb_loading';
		
		this.fx.contents.set(0);
		
		// AJAX call here
		var nextEffect = this.nextEffect.bind(this);
		var ajaxFailure = this.ajaxFailure.bind(this);
		var ajaxOptions = {
			method: 		'get',
			url:			this.href,
			update: 		this.contents, 
			evalScripts: 	this.options.evalScripts,
			evalResponse: 	this.options.evalResponse,
			onComplete: 	nextEffect, 
			onFailure: 		ajaxFailure
			};
		this.ajaxRequest = new Request.HTML(ajaxOptions).send();

		return false;
	},
	
	ajaxFailure: function (){
		this.contents.set('html','');
		this.error.clone().injectInside(this.contents);
		this.nextEffect();
		this.center.setStyle('cursor', 'pointer');
		this.bottom.setStyle('cursor', 'pointer');
		this.center.onclick = this.bottom.onclick = this.close.bind(this);		
	},
	
	nextEffect: function() {
		switch(this.step++) {
		case 1:
			// remove previous styling from the elements 
			// (e.g. styling applied in case of an error)
			this.center.className = '';
			this.center.setStyle('cursor', 'default');
			this.bottom.setStyle('cursor', 'default');
			this.center.onclick = this.bottom.onclick = '';
			this.caption.set('html',this.title);
			
			this.contents.setStyles ({width: this.options.contentsWidth + "px", height: this.options.contentsHeight + "px"});

			if(this.center.clientHeight != this.contents.offsetHeight) {
				this.fx.resize.start({height: this.contents.offsetHeight});
				break;
			}
			this.step++;
					
		case 2:
			if(this.center.clientWidth != this.contents.offsetWidth) {
				this.fx.resize.start({width: this.contents.offsetWidth, marginLeft: -this.contents.offsetWidth/2});
				break;
			}
			this.step++;
		
		case 3:
			this.bottom.setStyles({top: (this.top + this.center.clientHeight)+'px', width: this.contents.style.width, marginLeft: this.center.style.marginLeft, display: ''});
			this.fx.contents.start(1);
			break;
		
		case 4:
			if(this.options.animateCaption) {
				this.fx.bottom.start({opacity: 1, height: this.bottom.scrollHeight});
				break;
			}
			this.bottom.setStyles({opacity: '1', height: this.bottom.scrollHeight+'px'});

		case 5:
			this.step = 0;
		}
	},
	
	
	keyboardListener: function(event) {
		// close the MOOdalBox when the user presses CTRL + W, CTRL + X, ESC
		if ((event.control && event.key == 'w') || (event.control && event.key == 'x') || (event.key == 'esc')) {
			this.close();
			event.stop();
		}		
	},
	
	close: function() {
		if(!this.options.callBack()) return false;

		if(this.step < 0) {
			return false;
		}

		this.step = -1;
		for(var f in this.fx) this.fx[f].cancel();
		this.center.style.display = this.bottom.style.display = 'none';
		this.center.className = 'mb_loading';
		this.fx.overlay.chain(this.setup.pass(false, this)).start(0);
		return false;
	}
		
};

// startup
window.addEvent('domready', MOOdalBox.init.bind(MOOdalBox));
