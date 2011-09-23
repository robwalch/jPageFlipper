/// <reference path="../lib/jquery-1.4.1-vsdoc.js" />

var jQuery = jQuery || {};

(function ($) {  // TODO rename $s to $
	$.fn.pageFlipper = function (userOptions) {
		var defaults = {
			className: 'canvasHolder',
			pageWidth: 576,
			pageHeight: 450,
			easing: 0.5,
			fps: 60,
			defaultPageColor: 'white',
			backgroundColor: 'rgba(0, 0, 0, 0)',
			cornerSide: 55,
			debug: false
		};

		var options = $.extend(defaults, userOptions);
		options.updateDelay = 1000 / options.fps;
		options.spreadWidth = options.pageWidth * 2;
		options.pageDiagonal = Math.sqrt(options.pageWidth * options.pageWidth + options.pageHeight * options.pageHeight);
		options.pageClipWidth = options.pageWidth;
		options.pageClipHeight = options.pageWidth * 10;
		options.pageHeightOffset = Math.round(options.pageDiagonal - options.pageHeight);

		var canvas = null;
		var videoPlayer = null;
		var tempCanvas = null;
		var holder = null;
		var context = null;
		var tempContext = null;

		var mousePosition = null;
		var followerPosition = null;

		var pageAngle = 0;

		var spineTopX = options.pageWidth;
		var spineTopY = 0;
		var spineBottomTop = options.pageHeight;

		var bisectorTangetY = options.pageHeight;

		var leftIsActive;
		var videoPlaying = false;
		
		function createHandles() {
			mousePosition = {top: options.pageHeight, left: options.spreadWidth};
			followerPosition = {top: options.pageHeight, left: options.spreadWidth};
			leftIsActive = false;
		}

		function createCanvas(element) {
			holder = $("<div id='canvasHolder'></div>");
			holder
				.insertAfter(element)
				.addClass(options.className)
				.attr('width', options.spreadWidth)
				.attr('height', options.pageHeight + options.pageHeightOffset * 2);
			
			canvas = $("<canvas id='mainCanvas'><p>Your browser doesn't support HTML5.</p></canvas>");
			holder.append(canvas);

			canvas
				.attr('width', options.spreadWidth)
				.attr('height', options.pageHeight + options.pageHeightOffset * 2);
			
			videoPlayer = $("<div id='jplayer'></div>");
			videoPlayer
				.css({
					position: 'absolute',
					top: canvas.position().top + options.pageHeightOffset,
					left: canvas.position().left
				})
				.attr('width', options.pageWidth)
				.attr('height', options.pageHeight)
			holder.append(videoPlayer);
			
			tempCanvas = $("<canvas id='tempCanvas'></canvas>");
			tempCanvas
				.css({
					position: 'absolute',
					top: canvas.position().top,// +5,
					left: canvas.position().left// +5
				})
				.attr('width', canvas.width())
				.attr('height', canvas.height())
				.appendTo(holder);
				
			context = canvas.get(0).getContext('2d');
			tempContext = tempCanvas.get(0).getContext('2d');

			context.strokeStyle = "#aaaaaa";
			context.beginPath();
			context.moveTo(options.pageWidth, options.pageHeightOffset);
			context.lineTo(options.pageWidth, options.pageHeight + options.pageHeightOffset);
			context.stroke();
			
			$('#dropshadow').fadeTo(.8, 1.0);
		}

		function getRealPosition(element, position) {
			element = $(element);
			if (position == null) {
				position = element.position();
			}

			return {
				top: position.top + element.height() *0.5 - options.pageHeightOffset,
				left: position.left + element.width() *0.5
			};
		}

		var dragging = false;
		var flipInProgress = false;

		function activateMouseHandle() { 
			$(tempCanvas)
				.bind('mousemove', onCanvasHovering)
				.bind('mouseout', onCanvasHoverOut)
				.bind('mousedown', onCanvasActionStart)
				.bind('touchstart', onCanvasActionStart);
				
			$(document)
				.bind('mousemove', function(event) {
					nextMouseUpIsClick = false;
					if (!flipInProgress) {
						if (dragging) {
							var zeroPoint = $(holder).position();
							mousePosition = {left: event.pageX - zeroPoint.left, top: event.pageY - options.pageHeightOffset -zeroPoint.top};
						}
					}
				})
				.bind('touchmove', function(event) {
					nextMouseUpIsClick = false;
					if (!flipInProgress) {
						if (dragging && event.originalEvent != null && event.originalEvent.touches.length == 1) {
							event.preventDefault();
							var touch = event.originalEvent.touches[0],
								zeroPoint = $(holder).position();
							mousePosition = {left: touch.pageX - zeroPoint.left, top: touch.pageY - options.pageHeightOffset - zeroPoint.top};
						}
					}
				})
				.bind('mouseup', onCanvasActionStop)
				.bind('touchend', onCanvasActionStop);
		}

		var onCornerMoveComplete;

		function clearTempCanvas() {
			tempContext.clearRect(0, 0, tempCanvas.width(), tempCanvas.height());
		}

		function onCanvasClick() {
			if (flipInProgress) {
				completeFlip();
				clearTempCanvas();

				invalidate();
			}

			var lastDirectionPage = leftIsActive ? imageIndex == 0 : imageIndex == sourceImagesLength - 2;
			if (lastDirectionPage) {
				return;
			}

			var pageIsNotLast = leftIsActive ? imageIndex > 0 : imageIndex < sourceImagesLength - 2;
			if (pageIsNotLast) {
				mousePosition = {top: options.pageHeight, left: leftIsActive ? options.spreadWidth : 0};
				followerPosition = {left: leftIsActive ? 1 : options.spreadWidth - 1, top: options.pageHeight - 1};
				
				flipInProgress = true;

				onCornerMoveComplete = getOnCornerMoveComplete(leftIsActive);
			}
		}

		function getOnCornerMoveComplete(leftPageIsActive) {
			return function() {
				imageIndex += leftPageIsActive ? -2 : 2;
				mousePosition = {left: leftPageIsActive ? 0 : options.spreadWidth, top: options.pageHeight};
				followerPosition = mousePosition;
				drawBackgroundPages();
				clearTempCanvas();
				
				dragging = false;
				
				//redraw shadows
				//completeFlip();
				//onCanvasHovering();
				//updateHandlePositions();
				
				
				if (imageIndex <= 2) {
					$('#dropshadow').css({
						width: 620,
						height: 486,
						top: 462,
						left: 683
					});
				} else if (imageIndex >= sourceImagesLength - 4) {
					$('#dropshadow').css({
						width: 620,
						height: 486,
						top: 462,
						left: 101
					});
				} else {
					$('#dropshadow').css({
						width: 1207,
						height: 486,
						top: 462,
						left: 101
					});
				}
			}
		}

		function onCanvasActionStop(event) {
			if (nextMouseUpIsClick) {
				onCanvasClick();
				return;
			}

			if (!flipInProgress) {
				dragging = false;

				if (leftIsActive ? imageIndex == 0 : imageIndex == sourceImagesLength - 2) {
					return;
				}

				var left = event.pageX - $(holder).position().left;

				var actionDropArea = leftIsActive ? left > options.pageWidth : left < options.pageWidth;

				if (actionDropArea) {
					mousePosition = {left: leftIsActive ? options.spreadWidth : 0, top: options.pageHeight};
					flipInProgress = true;

					onCornerMoveComplete = getOnCornerMoveComplete(leftIsActive);
				} else {
					mousePosition = {left: leftIsActive ? options.cornerSide : options.spreadWidth - options.cornerSide, top: options.pageHeight - options.cornerSide};
				}
			}
		}

		var nextMouseUpIsClick = false;

		function onCanvasActionStart(event) {
			nextMouseUpIsClick = true;
			if (!flipInProgress) {
				var zeroPoint = $(holder).position();
				var relativePosition = {top: event.pageY - zeroPoint.top - options.pageHeightOffset, left: event.pageX - zeroPoint.left};
			
				if (relativePosition.top >= 0 && relativePosition.top < options.pageHeight) {
					if (relativePosition.left >= 0 && relativePosition.left < options.pageWidth) {
						mousePosition = {left: options.cornerSide, top: options.pageHeight - options.cornerSide};
						if (!leftIsActive) {
							leftIsActive = true;
							followerPosition = {left: 0, top: options.pageHeight};
						}
					} else if (relativePosition.left >= options.pageWidth && relativePosition.left < options.spreadWidth) {
						mousePosition = {left: options.spreadWidth - options.cornerSide, top: options.pageHeight - options.cornerSide};
						if (leftIsActive) {
							leftIsActive = false;
							followerPosition = {left: options.spreadWidth, top: options.pageHeight};
						}
					} else {
						mousePosition = {left: leftIsActive ? 0 : options.spreadWidth, top: options.pageHeight};
					}

					event.preventDefault();
					dragging = true;
				}
			}
		}
		
		function onCanvasHoverOut(event) {
			if (!dragging && !flipInProgress) {
				mousePosition = {left: leftIsActive ? 0 : options.spreadWidth, top: options.pageHeight};;
			}
		}

		function onCanvasHovering(event) {
			nextMouseUpIsClick = false;
			if (!dragging && !flipInProgress) {
				var zeroPoint = $(holder).position();
				var relativePosition = {top: event.pageY - zeroPoint.top - options.pageHeightOffset, left: event.pageX - zeroPoint.left};
			
				if (relativePosition.top >= 0 && relativePosition.top < options.pageHeight) {
					if (relativePosition.left >= 0 && relativePosition.left < options.pageWidth) {
						mousePosition = {left: options.cornerSide, top: options.pageHeight - options.cornerSide};
						if (!leftIsActive) {
							leftIsActive = true;
							followerPosition = {left: 0, top: options.pageHeight};
						}
					} else if (relativePosition.left >= options.pageWidth && relativePosition.left < options.spreadWidth) {
						mousePosition = {left: options.spreadWidth - options.cornerSide, top: options.pageHeight - options.cornerSide};
						if (leftIsActive) {
							leftIsActive = false;
							followerPosition = {left: options.spreadWidth, top: options.pageHeight};
						}
					} else {
						mousePosition = {left: leftIsActive ? 0 : options.spreadWidth, top: options.pageHeight};
					}
				} else {
					mousePosition = {left: leftIsActive ? 0 : options.spreadWidth, top: options.pageHeight};
				}
			}
		}

		function completeFlip() {
			if (onCornerMoveComplete != null) {
				onCornerMoveComplete();
				onCornerMoveComplete = null;
			}

			flipInProgress = false;
		}

		function updateHandlePositions() {
			if (mousePosition == null) {
				return;
			}
			
			var followerDeltaTop = (mousePosition.top - followerPosition.top) * options.easing;
			var followerDeltaLeft = (mousePosition.left - followerPosition.left) * options.easing;

			followerDeltaLeft = Math.abs(followerDeltaLeft) < 0.5 ? 0 : followerDeltaLeft;
			followerDeltaTop = Math.abs(followerDeltaTop) < 0.5 ? 0 : followerDeltaTop;

			if (followerDeltaLeft == 0 && followerDeltaTop == 0) {
				completeFlip();
				return;
			}

			followerPosition.top += followerDeltaTop;
			followerPosition.left += followerDeltaLeft;

//			console.debug('mouse: x - ' + mousePosition.left + ', y - ' + mousePosition.top);
//			console.debug('follower: x - ' + followerPosition.left + ', y - ' + followerPosition.top);

			var deltaX = followerPosition.left - options.pageWidth;
			var deltaY = spineBottomTop - followerPosition.top;

			var spineBottomToFollowerAngle = Math.atan2(deltaY, deltaX);

			var radiusLeft = Math.cos(spineBottomToFollowerAngle) * options.pageWidth + options.pageWidth;
			var radiusTop = spineBottomTop - Math.sin(spineBottomToFollowerAngle) * options.pageWidth;

			var distanceToFollower = Math.sqrt(
				(spineBottomTop - followerPosition.top) * (spineBottomTop - followerPosition.top) +
				(followerPosition.left - options.pageWidth) * (followerPosition.left - options.pageWidth)
			);
			var distanceToRadius = Math.sqrt(
				(spineBottomTop - radiusTop) * (spineBottomTop - radiusTop) +
				(radiusLeft - options.pageWidth) * (radiusLeft - options.pageWidth)
			);
			
			var cornerX;
			var cornerY;
			if (distanceToRadius < distanceToFollower) {
				cornerX = radiusLeft;
				cornerY = radiusTop;
			} else {
				cornerX = followerPosition.left;
				cornerY = followerPosition.top;
			}
			
			deltaX = spineTopX - cornerX;
			deltaY = cornerY;

			distanceToFollower = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
			var spineTopToFollowerAngle = Math.atan2(deltaY, deltaX);

			if (distanceToFollower > options.pageDiagonal) {
				var radius2HandleX = -Math.cos(spineTopToFollowerAngle) * options.pageDiagonal + options.pageWidth;
				var radius2HandleY = spineTopY + Math.sin(spineTopToFollowerAngle) * options.pageDiagonal;

				cornerX = radius2HandleX;
				cornerY = radius2HandleY;
			}
			
			var bisectorX = leftIsActive ? cornerX *0.5 : ((options.spreadWidth - cornerX) *0.5 + cornerX);
			if (bisectorX < 1) return;
			if (bisectorX > options.spreadWidth-0.5) return;
			var bisectorY = (options.pageHeight - cornerY) *0.5 + cornerY;

			var bisectorAngle = Math.atan2(options.pageHeight - bisectorY, leftIsActive ? bisectorX : options.spreadWidth - bisectorX);
			var bisectorDeltaX = Math.tan(bisectorAngle) * (options.pageHeight - bisectorY);
			var bisectorTangetX = bisectorX + bisectorDeltaX * (leftIsActive ? 1 : -1);
			if (bisectorTangetX < 0) {
				bisectorTangetX = 0;
			}

			var pageAngleDeltaY = bisectorTangetY - cornerY;
			var pageAngleDeltaX = bisectorTangetX - cornerX;
			pageAngle = leftIsActive ? Math.atan2(-pageAngleDeltaY, -pageAngleDeltaX) : Math.atan2(pageAngleDeltaY, pageAngleDeltaX);

			var pageX = cornerX + options.pageWidth *0.5 * Math.cos(pageAngle) * (leftIsActive ? -1 : 1)
				+ options.pageHeight *0.5 * Math.sin(pageAngle);
			var pageY = cornerY - options.pageHeight *0.5 * Math.cos(pageAngle)
				+ options.pageWidth *0.5 * Math.sin(pageAngle) * (leftIsActive ? -1 : 1);
			
			var maskTanAngle = Math.atan2(options.pageHeight - bisectorY,
				bisectorX - bisectorTangetX);
			var maskAngle = 90 * (maskTanAngle / Math.abs(maskTanAngle)) - maskTanAngle * 180 / Math.PI;
			maskAngle = maskAngle / 180 * Math.PI;

			var xCoefficient = bisectorTangetY - bisectorY;
			var yCoefficient = bisectorX - bisectorTangetX;
			var freeCoefficient = bisectorTangetX * bisectorY - bisectorX * bisectorTangetY;

			var halfPageClipX = -(yCoefficient * options.pageHeight *0.5 + freeCoefficient) / xCoefficient;
			var halfPageClipOffset = options.pageClipWidth *0.5 / Math.cos(maskAngle);

			var maskLeft = halfPageClipX + halfPageClipOffset * (leftIsActive ? 1 : -1);
			var maskTop = options.pageHeight *0.5;

			var anotherMaskLeft = maskLeft +
				(leftIsActive ?
					-halfPageClipOffset * 3:
					halfPageClipOffset);

//			anotherMaskLeft -= options.pageWidth * Math.cos(maskAngle);
			
			//var foldWidth = Math.min(pageAngleDeltaY*0.5, Math.sqrt(pageAngleDeltaX * pageAngleDeltaX + pageAngleDeltaY * pageAngleDeltaY));
			var foldWidth = Math.sqrt(pageAngleDeltaX * pageAngleDeltaX + pageAngleDeltaY * pageAngleDeltaY);
			//var averageOffset = Math.min(Math.abs(pageAngle * options.pageWidth), options.pageWidth);
			//foldWidth = (foldWidth + averageOffset) *0.5;
			
			drawPage(pageX, pageY, pageAngle, maskLeft, maskTop, maskAngle, anotherMaskLeft, foldWidth);
			
			/*if (options.debug) {
				tempContext.save();
				tempContext.beginPath();
				tempContext.fillStyle = 'rgba(255,0,0,1)';
				tempContext.fillRect(0, 12 , distanceToFollower, 4);
				tempContext.fillText("distanceToFollower", 0, 10);

				tempContext.fillStyle = 'rgba(0,0,255,1)';
				tempContext.fillRect(0, 32 , foldWidth, 4);
				tempContext.fillText("foldWidth", 0, 30);

				// tempContext.fillStyle = 'rgba(255,255,0,1)';
				// 			tempContext.fillRect(options.pageWidth, 32 , pageAngleDeltaX, 4);
				// 			tempContext.fillText("pageAngleDeltaX", options.pageWidth, 30);
				// 			tempContext.fillStyle = 'rgba(255,255,0,1)';
				// 			tempContext.fillRect(options.pageWidth, 52 , pageAngleDeltaY, 4);
				// 			tempContext.fillText("pageAngleDeltaY", options.pageWidth, 50);

				tempContext.fillStyle = 'rgba(255,255,0,1)';
				tempContext.fillText("bisectorTangetX: "+ bisectorTangetX, 70, 50);
				tempContext.fillStyle = 'rgba(255,255,0,1)';
				tempContext.fillText("bisectorTangetY: "+ bisectorTangetY, 70, 65);
				
				tempContext.fillStyle = 'rgba(255,255,0,1)';
				tempContext.fillText("bisectorX: "+ bisectorX, 70, 80);
				tempContext.fillStyle = 'rgba(255,255,0,1)';
				tempContext.fillText("bisectorY: "+ bisectorY, 70, 95);
				
				
				tempContext.fillStyle = 'rgba(0,255,0,1)';
				tempContext.fillText("pageAngle "+ pageAngle, 256, 50);

				//tempContext.fillStyle = 'rgba(255,0,0,1)';
				//tempContext.fillText("averageOffset "+ averageOffset, 400, 50);


				
				// tempContext.fillStyle = 'rgba(0,255,0,1)';
				// 			tempContext.fillRect(cornerX, cornerY , 4, 4);
				// 			tempContext.fillText("corner", cornerX, cornerY);
				// 			
				// 			tempContext.fillStyle = 'rgba(0,255,0,1)';
				// 			tempContext.fillRect(options.pageWidth+pageAngleDeltaX, options.pageWidth+pageAngleDeltaY , 4, 4);
				// 			tempContext.fillText("pageD", options.pageWidth+pageAngleDeltaX, options.pageWidth+pageAngleDeltaY);
				tempContext.restore();
			}*/
		}

		function drawPage(pageX, pageY, pageAngle, maskX, maskY, maskAngle, anotherMaskX, foldWidth) {
			
			var lastDirectionPage = leftIsActive ? imageIndex == 0 : imageIndex == sourceImagesLength - 2;
			if (lastDirectionPage) {
				return;
			}
			
			tempContext.clearRect(0, 0, tempCanvas.width(), tempCanvas.height());
			tempContext.save();
			
			var shadowWidth = foldWidth * 1.5;
			var shadowAlpha = Math.min(1, Math.max(0, (options.pageWidth - foldWidth) / options.pageWidth) * 20);
			var xOffset = leftIsActive ? options.pageWidth: 0;
			var foldGradient;
			
			// Clip background drawing behind first and last pages
			var nextToLastDirectionPage = leftIsActive ? imageIndex == 2 : imageIndex == sourceImagesLength - 4;
			if (nextToLastDirectionPage) {
				//full clear before clipping
				context.clearRect(0, 0, options.spreadWidth, options.pageHeight + options.pageHeightOffset * 2);
				
				context.save();
				
				context.translate(maskX, maskY + options.pageHeightOffset);
				context.rotate(maskAngle);
				
				context.beginPath();
				if (options.debug) {
					context.strokeStyle = 'rgba(0,255,255,0.25)';
					context.lineWidth = 3;
					context.strokeRect(-options.pageClipWidth *0.5 -((imageIndex==2)?0:options.pageClipWidth), -options.pageDiagonal*4, options.pageClipWidth*2, options.pageClipHeight);
				}
				context.rect(-options.pageClipWidth *0.5 -((imageIndex==2)?0:options.pageClipWidth), -options.pageDiagonal*4, options.pageClipWidth*2, options.pageClipHeight);
				context.clip();
				
				context.rotate(-maskAngle);
				context.translate(-maskX, -maskY - options.pageHeightOffset);
				
				drawBackgroundPages(true);
				
				context.restore();
			
			//quick fix for cover corner clipping when switching from left to right
			} else if (imageIndex == 2) {
				var leftImage = getLeftImage();
				drawSource(context, leftImage, 0, options.pageHeightOffset);
			} 	else if (imageIndex == sourceImagesLength - 4) {
				var rightImage = getRightImage();
				drawSource(context, rightImage, options.pageWidth, options.pageHeightOffset);
			}
			
			// Appearing Page / ------------------------------------------------------
			
			tempContext.translate(anotherMaskX, maskY + options.pageHeightOffset);
			tempContext.rotate(maskAngle);
			
			tempContext.beginPath();
			if (options.debug) {
				tempContext.strokeStyle = 'rgba(255,0,0,0.5)';
				tempContext.strokeRect(0, -options.pageDiagonal, options.pageClipWidth, options.pageClipHeight);
			}
			tempContext.rect(0, -options.pageDiagonal, options.pageClipWidth, options.pageClipHeight);
			tempContext.clip();
			
			tempContext.rotate(-maskAngle);
			tempContext.translate(-anotherMaskX, -maskY - options.pageHeightOffset);

			drawSource(tempContext, getAppearingImage(), leftIsActive ? 0 : options.pageWidth, options.pageHeightOffset);
			
			tempContext.restore();
			tempContext.save();
			
			// Fold dropshadow
			tempContext.beginPath();
			tempContext.rect(0, options.pageHeightOffset, options.spreadWidth, options.pageHeight);
			tempContext.clip();
			
			tempContext.translate(anotherMaskX, maskY + options.pageHeightOffset);
			tempContext.rotate(maskAngle);
			
			tempContext.globalAlpha = shadowAlpha;
			
			// fold line
			tempContext.strokeStyle = 'rgba(0,0,0,0.1)';
			tempContext.lineWidth = 2;
			tempContext.beginPath();
			tempContext.moveTo(xOffset, -options.pageClipHeight *0.5);
			tempContext.lineTo(xOffset,  options.pageClipHeight *0.5);
			tempContext.stroke();
			
			tempContext.translate(-shadowWidth *0.33, 0);
			
			foldGradient = tempContext.createLinearGradient(xOffset, 0, xOffset + shadowWidth, 0);
			foldGradient.addColorStop(0.0, 'rgba(0,0,0,0)');
			foldGradient.addColorStop(0.32, 'rgba(0,0,0,.15)');
			foldGradient.addColorStop(0.33, 'rgba(0,0,0,.2)');
			foldGradient.addColorStop(1.0, 'rgba(0,0,0,0)');
			tempContext.fillStyle = foldGradient;
			tempContext.beginPath();
			tempContext.fillRect(xOffset, -options.pageDiagonal*4, shadowWidth, options.pageClipHeight);
			
			tempContext.restore();
			tempContext.save();
			
			// // SEAM SHADOW
			// foldGradient = tempContext.createLinearGradient(options.pageWidth, 0, options.pageWidth+20, 0);
			// //foldGradient.addColorStop(0.0, 'rgba(0,0,0,0)');
			// foldGradient.addColorStop(0.0, 'rgba(0,0,0,.2)');
			// foldGradient.addColorStop(1.0, 'rgba(0,0,0,0)');
			// tempContext.fillStyle = foldGradient;
			// tempContext.beginPath();
			// tempContext.fillRect(options.pageWidth, options.pageHeightOffset, 20, options.pageHeight);
			// 
			// tempContext.restore();
			// tempContext.save();
			
			// FOLDED PAGE < ----------------------------------------------------------
			tempContext.translate(maskX, maskY + options.pageHeightOffset);
			tempContext.rotate(maskAngle);

			tempContext.beginPath();
			// if (options.debug) {
			// 	tempContext.fillStyle = 'rgba(255,0,0,0.25)';
			// 	tempContext.fillRect(-options.pageClipWidth *0.5, -options.pageClipHeight *0.5, options.pageClipWidth, options.pageClipHeight);
			// }
			tempContext.rect(-options.pageClipWidth *0.5, -options.pageClipHeight *0.5, options.pageClipWidth, options.pageClipHeight);
			tempContext.clip();

			tempContext.rotate(-maskAngle);
			tempContext.translate(-maskX, -maskY - options.pageHeightOffset);

			tempContext.translate(pageX, pageY + options.pageHeightOffset);
			tempContext.rotate(pageAngle);

			drawSource(tempContext, getFlipperImage(), -options.pageWidth *0.5, -options.pageHeight *0.5);
			
			tempContext.restore();
			tempContext.save();
			
			// Fold top shadow
			tempContext.translate(maskX, maskY + options.pageHeightOffset);
			tempContext.rotate(maskAngle);
			
			//clip fold
			tempContext.rotate(-maskAngle);
			tempContext.translate(-maskX, -maskY - options.pageHeightOffset);

			tempContext.translate(pageX, pageY + options.pageHeightOffset);
			tempContext.rotate(pageAngle);
			
			tempContext.beginPath();
			if (options.debug) {
				tempContext.strokeStyle = 'rgba(255,0,255,0.25)';
				tempContext.strokeRect(-options.pageClipWidth *0.5, -options.pageHeight *0.5, options.pageClipWidth, options.pageHeight);
			}
			tempContext.rect(-options.pageClipWidth *0.5, -options.pageHeight *0.5, options.pageClipWidth, options.pageHeight);
			tempContext.clip();
			
			tempContext.rotate(-pageAngle);
			tempContext.translate(-pageX, -pageY - options.pageHeightOffset);
			
			tempContext.translate(+maskX, maskY + options.pageHeightOffset);
			tempContext.rotate(maskAngle);
			
			//draw shadow
			tempContext.globalAlpha = shadowAlpha;
			var foldGradient = tempContext.createLinearGradient(options.pageClipWidth *0.5 -foldWidth, 0, options.pageClipWidth *0.5, 0);
			if (leftIsActive) {
				foldGradient = tempContext.createLinearGradient(options.pageClipWidth *0.5 -xOffset +foldWidth, 0, options.pageClipWidth *0.5 - xOffset, 0);
			}
			foldGradient.addColorStop(0.1, 'rgba(0,0,0,0)');
			foldGradient.addColorStop(0.75, 'rgba(0,0,0,.1)');
			foldGradient.addColorStop(1.0, 'rgba(0,0,0,0)');
			tempContext.fillStyle = foldGradient;
			tempContext.beginPath();
			tempContext.fillRect(options.pageClipWidth *0.5 -(leftIsActive?xOffset:foldWidth), -options.pageClipHeight *0.5, foldWidth, options.pageClipHeight);
			if (options.debug) {
				tempContext.strokeStyle = 'rgba(0,255,0,0.25)';
				tempContext.strokeRect(options.pageClipWidth *0.5 -(leftIsActive?xOffset:foldWidth), -options.pageClipHeight *0.5, foldWidth, options.pageClipHeight);
			}
			tempContext.restore();
		}

		function positionElement(element, x, y) {
			element = $(element);
			element.css({
				top: y - element.height() *0.5 + options.pageHeightOffset,
				left: x - element.width() *0.5
			});
		}

		function rotateElement(element, angle) {
			var angleInDegrees = angle / Math.PI * 180;
			$(element)
				.css({
					'-moz-transform': 'rotate(' + angleInDegrees + 'deg)',
					'-webkit-transform': 'rotate(' + angleInDegrees + 'deg)'
				});
		}

		function startInvalidationWorker() {
			var worker = function() {
				invalidate();
				setTimeout(worker, videoPlaying? 33 : options.updateDelay);
			};

			worker();
		}

		function invalidate() {
			updateHandlePositions();
		}

		function initializeFlipper(element) {
			createCanvas(element);

			createHandles();

			activateMouseHandle();
			startInvalidationWorker();
			
			initializeDefaultImage();
			initializeVideoPlayer();
			
			var listImages = $('li img', element);
			sourceImagesLength = listImages.length + 2;
			for (var index = 0; index < listImages.length; index++) {
				sourceImages[index] = defaultImage;
				loadPageImage(listImages, index);
				loadPageVideo(listImages, index);
			}

			if (listImages.length % 2 == 1) {
				sourceImages.push(defaultImage);
				sourceImagesLength++;
			}

			drawBackgroundPages();
		};

		function drawBackgroundPages(skipVideo) {
			context.clearRect(0, 0, options.spreadWidth, options.pageHeight + options.pageHeightOffset * 2);
			//drop shadow
			// context.save();
			// context.shadowOffsetX = 8;
			// 			context.shadowOffsetY = 4;
			// 			context.shadowBlur = 20;
			// 			context.shadowColor = "black";
			// 			context.fillStyle = "rgba(0,0,0,0.5)";
			// 			context.beginPath();
			//context.fillRect(0, options.pageHeightOffset, options.spreadWidth, options.pageHeight);
			//context.restore();
			
			var leftImage = getLeftImage();
			var rightImage = getRightImage();
			
			if (leftImage != null) {
				drawSource(context, leftImage, 0, options.pageHeightOffset);
			//} else {
			//	context.clearRect(0, options.pageHeightOffset-1, options.pageWidth, options.pageHeight+2);
			}
			if (rightImage != null) {
				drawSource(context, rightImage, options.pageWidth, options.pageHeightOffset);
			//} else {
			//	context.clearRect(options.pageWidth, options.pageHeightOffset-1, options.pageWidth, options.pageHeight+2);
			
				// SEAM SHADOW
				// context.restore();
				// foldGradient = context.createLinearGradient(options.pageWidth, 0, options.pageWidth+20, 0);
				// //foldGradient.addColorStop(0.0, 'rgba(0,0,0,0)');
				// foldGradient.addColorStop(0.0, 'rgba(0,0,0,.2)');
				// foldGradient.addColorStop(1.0, 'rgba(0,0,0,0)');
				// context.fillStyle = foldGradient;
				// context.beginPath();
				// context.fillRect(options.pageWidth, options.pageHeightOffset, 20, options.pageHeight);
			}
			//context.restore();
			
			//add video
			if (skipVideo) return;
			var video = getLeftVideo();
			if (video != null && video.type == "video") {
				videoPlayer.css('left', 0);
			} else {
				video = getRightVideo();
				if (video != null && video.type == "video") {
					videoPlayer.css('left', canvas.position().left + options.pageWidth);
				}
			}
			if (video != null && video.type == "video") {
				videoPlayer.jPlayer("setMedia", {
					m4v: video.data,
					poster: leftImage.data
				});
				setTimeout(playVideo, options.updateDelay * 10);
			} else {
				//stop and hide player
				if (videoPlaying) videoPlayer.jPlayer("stop");
				videoPlayer.jPlayer("setMedia", {});
			}
		}

		function drawSource(drawingContext, source, x, y) {
			if (source != null && source.type != null && source.type.length > 0) {
				if ((source.type == 'image') && source.data != null) {
					if (source.isLoaded) {
						drawingContext.drawImage(source.data, x, y);
					}
				} else if (source.type == 'background') {
					drawingContext.clearRect(x, y-1, options.pageWidth, options.pageHeight+2);
					drawingContext.fillStyle = options.backgroundColor;
					drawingContext.fillRect(x, y, options.pageWidth, options.pageHeight);
				}
			}
		}

		var defaultImage = null;
		
		function initializeDefaultImage() {
			var defaultImageCanvas = $("<canvas></canvas>");
			defaultImageCanvas
				.attr('width', options.pageWidth)
				.attr('height', options.pageHeight);

			var context = defaultImageCanvas[0].getContext('2d');
			context.fillStyle = options.defaultPageColor;
			context.fillRect(0, 0, options.pageWidth, options.pageHeight);

			var imageData = new Image();
			imageData.onload = function() {
				defaultImage.isLoaded = true;
			};
			imageData.src = defaultImageCanvas[0].toDataURL();
			defaultImage = {type: 'image', data: imageData, isLoaded: false};
		}

		function getPageImage(index) {
			if (index == 0 || index == sourceImagesLength - 1) {
				return {type: 'background'};
			}

			return sourceImages[index - 1];
		}

		function loadPageImage(images, index) {
			var source = $(images[index]).attr('src');
			loadImage(source, function(loadedImage) {
				sourceImages[index] = {type: 'image', data: loadedImage, isLoaded: true};
				if (index == imageIndex || index == imageIndex + 1) {
					 drawBackgroundPages();
				}
			});
		}

		function loadPageVideo(images, index) {
			var source = $(images[index]).attr('video');
			if (source != null) {
				sourceVideos[index] = {type: 'video', data: source};
			}
			
			//if (index == imageIndex || index == imageIndex + 1) {
			//	 render video on current page;
			//}
		}

		function loadImage(url, onLoaded) {
			var image = new Image();
			image.onload = function() {
				onLoaded(image);
			};
			image.src = url;
		}

		function getLeftImage() {
			return getPageImage(imageIndex);
		}

		function getRightImage() {
			return getPageImage(imageIndex + 1);
		}

		function getFlipperImage() {
			return getPageImage(leftIsActive ? imageIndex - 1 : imageIndex + 2);
		}

		function getAppearingImage() {
			return getPageImage(leftIsActive ? imageIndex - 2 : imageIndex + 3);
		}
		
		function initializeVideoPlayer() {
			videoPlayer.jPlayer({
				solution:"flash, html",
				backgroundColor:"rgba(0,0,0,0)",//"#000",//
				wmode: "transparent",
				size: {
					width: options.pageWidth+"px",
					height: options.pageHeight+"px"
				},
				swfPath: "",
				supplied: "m4v",
				ready: function () {videoPlaying = false},
				play:  function () {videoPlaying = true},
				pause: function () {videoPlaying = false},
				ended: function () {videoPlaying = false}
			});
			// videoPlayer.click(function (event) {
			// 				videoPlayer.jPlayer(videoPlaying?"pause":"play");
			// 			});
			//videoPlayer.hide();
		}
		
		function playVideo() {
			videoPlayer.jPlayer("play");
		}
		
		function getPageVideo(index) {
			if (index == 0 || index == sourceImagesLength - 1) {
				return {type: 'background'};
			}

			return sourceVideos[index - 1];
		}
		
		function getLeftVideo() {
			return getPageVideo(imageIndex);
		}
		
		function getRightVideo() {
			return getPageVideo(imageIndex + 1);
		}
		
		var sourceImagesLength = 0;
		var sourceImages = [];
		var sourceVideos = [];
		var imageIndex = 0;

		return this.each(function () {
			initializeFlipper(this);
		});
	};
})(jQuery);
