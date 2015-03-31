/*! Worker 0.0.1 */
/**
*  @module BlobWorker
*  @namespace cloudkid
*/
(function()
{
	/**
	*	Internal class that pretends to be a Web Worker's context.
	*	@class SubWorker
	*	@constructor
	*	@param {String} codeString A string to evaluate into worker code.
	*	@param {FallbackWorker} parent The FallbackWorker that owns this SubWorker.
	*/
	var SubWorker = function(codeString, parent)
	{
		this._wParent = parent;
		eval(codeString); // jshint ignore:line
	};

	// Referene to the prototpye
	var p = SubWorker.prototype;

	/**
	*	See https://developer.mozilla.org/en-US/docs/Web/API/Worker.onmessage
	*	@property {Function} onmessage
	*/
	p.onmessage = null;

	/**
	*	The FallbackWorker that is controlls by this SubWorker.
	*	@property {FallbackWorker} _wParent
	*	@private
	*/
	p._wParent = null;

	/**
	*	See https://developer.mozilla.org/en-US/docs/Web/API/Worker.postMessage
	*	@method postMessage
	*	@param {*} data The data to send.
	*/
	p.postMessage = function(data)
	{
		var parent = this._wParent;
		setTimeout(parent.onmessage.bind(parent, {data:data}), 1);
	};

	// Assign to namespace
	namespace("cloudkid").SubWorker = SubWorker;

}());
/**
*  @module BlobWorker
*  @namespace cloudkid
*/
(function()
{
	// Include classes
	var SubWorker = include('cloudkid.SubWorker');

	/**
	*	An internal class that duplicates the Worker API as a fallback when WebWorkers are not supported.
	*	@class FallbackWorker
	*	@constructor
	*	@param {String} codeString A string to evaluate into worker code.
	*/
	var FallbackWorker = function(codeString)
	{
		this._wChild = new SubWorker(codeString, this);
	};

	// Reference to prototype
	p = FallbackWorker.prototype;

	/**
	*	See https://developer.mozilla.org/en-US/docs/Web/API/Worker.postMessage
	*	@method postMessage
	*	@param {*} data The data to send.
	*/
	p.postMessage = function(data)
	{
		var child = this._wChild;
		setTimeout(child.onmessage.bind(child, {data:data}), 1);
	};

	/**
	*	See https://developer.mozilla.org/en-US/docs/Web/API/Worker.terminate
	*	@method terminate
	*/
	p.terminate = function()
	{
		this.onmessage = null;
		var child = this._wChild;
		child._wParent = null;
		child.onmessage = null;
		this._wChild = null;
	};

	/**
	*	See https://developer.mozilla.org/en-US/docs/Web/API/Worker.onmessage
	*	@property {Function} onmessage
	*/
	p.onmessage = null;
	
	/**
	*	The SubWorker that is controlled by this FallbackWorker.
	*	@property {SubWorker} _wChild
	*	@private
	*/
	p._wChild = null;

	// Assign to namespace
	namespace("cloudkid").FallbackWorker = FallbackWorker;

}());
/**
*  @module BlobWorker
*  @namespace cloudkid
*/
(function()
{
	// Include classes
	var FallbackWorker = include('cloudkid.FallbackWorker');

	// Combine prefixed URL for createObjectURL from blobs.
	var URL = window.URL || window.webkitURL;

	// Combine prefixed blob builder
	var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;

	/**
	*  The Web Workers specification defines an API for spawning background scripts in your web 
	*  application. Web Workers allow you to do things like fire up long-running scripts to 
	*  handle computationally intensive tasks, but without blocking the UI or other scripts 
	*  to handle user interactions. Because Workers aren't available on all browsers, we provide
	*  a helpful polyfill for backward compatibility. This worker is designed to run 
	*  asyncronously instead of calling an external file.
	*
	*	var workerCode = "this.initialVariable = 10;" +
	*	"this.onmessage = function(event)" +
	*	"{" +
	*		"var data = event.data;" +
	*		"var returnVal = this.initialVariable + data.addValue;" +
	*		"this.postMessage(returnVal);" +
	*	"};";
	*
	*	// Create the worker
	*	var worker = cloudkid.Worker.init(workerCode);
	*	worker.onmessage = function(e) {
	*		// e.data is the returnVal
	*	};
	*	
	*	// Start the worker.
	*	worker.postMessage(); 
	*
	*  @class Worker
	*/
	var Worker = {};

	/**
	*  Initialize the worker, this is how you create a Worker or FallbackWorker object.
	*  @method init
	*  @static
	*  @param {String} codeString The code in string form to make the worker from. As a string, fallback support is easier.
	*  @return {cloudkid.FallbackWorker|window.Worker} Either a Web Worker or a fallback with the same API to use.
	*/
	Worker.init = function(codeString)
	{
		if(!URL || !window.Worker) return new FallbackWorker(codeString);

		var blob;
		try
		{
			blob = new Blob([codeString], {type: 'application/javascript'});
		}
		catch (e)
		{
			// try Backwards-compatibility with blob builders
			if (!BlobBuilder) return new FallbackWorker(codeString);

			try
			{
				blob = new BlobBuilder();
				blob.append(codeString);
				blob = blob.getBlob();
			}
			catch(error)
			{
				// no way of generating a blob to create the worker from
				return new FallbackWorker(codeString);
			}
		}

		// if somehow no blob was created, return a fallback worker
		if (!blob) return new FallbackWorker(codeString);

		try
		{
			// IE 10 and 11, while supporting Blob and Workers, should 
			// throw an error here, so we should catch it and fall back
			var worker = new Worker(URL.createObjectURL(blob));
			return worker;
		}
		catch(e)
		{
			// can't create a worker
			return new FallbackWorker(codeString);
		}
	};

	// Assign to namespace
	namespace("cloudkid").Worker = Worker;
	
}());