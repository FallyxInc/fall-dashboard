(function ($) {
  $(document).ready(function () {

     // sticky header active
     if ($("#header").length > 0) {
      $(window).on("scroll", function (event) {
        var scroll = $(window).scrollTop();
        if (scroll < 1) {
          $("#header").removeClass("sticky");
        } else {
          $("#header").addClass("sticky");
        }
      });
    }
    
    // pricing-plan-tab

    $("#ce-toggle").on('click', function(event){
      $(".plan-toggle-wrap").toggleClass("active");
    });
    $("#ce-toggle").change(function () {
    if ($(this).is(":checked")) {
    $(".tab-content #yearly").hide();
    $(".tab-content #monthly").show();
    } else {
        $(".tab-content #yearly").show();
        $(".tab-content #monthly").hide();
      }
    });

        $(".header-search-btn").on("click", function (e) {
          e.preventDefault();
          $(".header-search-form-wrapper").addClass("open");
          $('.header-search-form-wrapper input[type="search"]').focus();
          $('.body-overlay').addClass('active');
     });
     $(".tx-search-close").on("click", function (e) {
          e.preventDefault();
          $(".header-search-form-wrapper").removeClass("open");
          $("body").removeClass("active");
          $('.body-overlay').removeClass('active');
     });


                //testimonial 1
                $(".tes1-slider").slick({
                  margin: "30",
                  slidesToShow: 1,
                  arrows: true,
                  centerMode: true,
                  loop: true,
                  centerMode: false,
                  prevArrow: $(".testimonial-next-arrow"),
                  nextArrow: $(".testimonial-prev-arrow"),
                  draggable: true,
                  fade: false,
                  responsive: [
                    {
                      breakpoint: 769,
                      settings: {
                        arrows: false,
                        centerMode: false,
                        centerPadding: "40px",
                        slidesToShow: 1,
                      },
                    },
                    {
                      breakpoint: 480,
                      settings: {
                        arrows: false,
                        centerMode: false,
                        centerPadding: "40px",
                        slidesToShow: 1,
                      },
                    },
                  ],
                });

                //-- project slider --
                $(".project-slider").owlCarousel({
                  loop: true,
                  nav: true,
                  center: true,
                  dots: false,
                  // autoplay: true,
                  // autoplayTimeout: 3000,
                  items: 3,
                  autoplay: true,
                  autoplayTimeout: 5000,
                  smartSpeed: 1000,
                  slideSpeed: 600,
                  navText: ['<i class="fa-solid fa-arrow-left"></i>', '<i class="fa-solid fa-arrow-right"></i>'],
                  responsive: {
                    0: {
                      items: 1,
                    },
                    900: {
                      items: 3,
                    },
                  },
                });


                //=== logo slider ===

                $(".logo-slider").owlCarousel({
                  loop: true,
                  nav: false,
                  center: false,
                  dots: false,
                  // autoplay: true,
                  // autoplayTimeout: 3000,
                  items: 3,
                  autoplay: true,
                  autoplayTimeout: 5000,
                  smartSpeed: 1000,
                  slideSpeed: 600,
                  navText: ['<i class="fa-solid fa-arrow-left"></i>', '<i class="fa-solid fa-arrow-right"></i>'],

                  responsive: {
                    0: {
                      items: 2,
                    },
                    426: {
                      items: 4,
                    },
                    900: {
                      items: 4,
                    },
                  },
                });

                //==== home2 solider =====

                $(".tes2-slider").owlCarousel({
                  loop: true,
                  nav: false,
                  center: true,
                  dots: true,
                  autoplay: true,
                  autoplayTimeout: 3000,
                  items: 3,
                  autoplay: true,
                  autoplayTimeout: 5000,
                  smartSpeed: 1000,
                  slideSpeed: 600,

                  responsive: {
                    0: {
                      items: 1,
                    },
                    900: {
                      items: 3,
                    },
                  },

                });


   //testimonial slider
    $(".testimonial-nav").slick({
      slidesToShow: 5,
      slidesToScroll: 1,
      asNavFor: ".slider-testimonial",
      dots: false,
      loop: true,
      centerMode: true,
      focusOnSelect: true,
      arrows: false,
    });

    $(".slider-testimonial").slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: true,
      prevArrow: $(".testimonial-prev-arrow"),
      nextArrow: $(".testimonial-next-arrow"),
      fade: true,
      loop: true,
      asNavFor: ".testimonial-nav",
    });



  //Aos animation active

    AOS.init({
      offset: 100,
      duration: 400,
      easing: "ease-in-out",
      anchorPlacement: "top-bottom",
      disable: "mobile",
    });


    //Video poppup
    if ($(".play-btn").length > 0) {
      $(".play-btn").magnificPopup({
        type: "iframe",
      });
    }
    
        // page-progress
        var progressPath = document.querySelector(".progress-wrap path");
        var pathLength = progressPath.getTotalLength();
        progressPath.style.transition = progressPath.style.WebkitTransition =
          "none";
        progressPath.style.strokeDasharray = pathLength + " " + pathLength;
        progressPath.style.strokeDashoffset = pathLength;
        progressPath.getBoundingClientRect();
        progressPath.style.transition = progressPath.style.WebkitTransition =
          "stroke-dashoffset 10ms linear";
        var updateProgress = function () {
          var scroll = $(window).scrollTop();
          var height = $(document).height() - $(window).height();
          var progress = pathLength - (scroll * pathLength) / height;
          progressPath.style.strokeDashoffset = progress;
        };
        updateProgress();
        $(window).scroll(updateProgress);
        var offset = 50;
        var duration = 550;
        jQuery(window).on("scroll", function () {
          if (jQuery(this).scrollTop() > offset) {
            jQuery(".progress-wrap").addClass("active-progress");
          } else {
            jQuery(".progress-wrap").removeClass("active-progress");
          }
        });
        jQuery(".progress-wrap").on("click", function (event) {
          event.preventDefault();
          jQuery("html, body").animate({ scrollTop: 0 }, duration);
          return false;
        });
    
        
        //--- hover action ----
        $('.cs_hover_active').on('mouseenter', function() {
          $(this).addClass('active').siblings().removeClass('active');
         }).on('mouseleave', function() {
          $(this).removeClass('active');
        });
    });

    //preloader
    $(window).on("load", function (event) {
      setTimeout(function () {
        $(".preloader-area").fadeToggle();
      }, 500);
    });

    //accordion1 active class
    const colors = $(".accordion1 .accordion-item");

    colors.on("click", function () {
      $(".accordion1 .accordion-item").removeClass("active");
      $(this).addClass("active");
     });

        //accordion2 active class
        const colors2 = $(".accordion2 .accordion-item");

        colors2.on("click", function () {
        $(".accordion2 .accordion-item").removeClass("active");
        $(this).addClass("active");
        });

        
})(jQuery);