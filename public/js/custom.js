// const changestatus = (link) => {
//     // $.ajax({
//     //     type: "GET",
//     //     url: link,
//     //     dataType: "json",
//     //     success: function (response) {
//     //         console.log('value:', response)
//     //     }
//     // });

//     $.get(`adminCCC/${link}`,
//         function (data, textStatus, jqXHR) {

//             console.log('value:', data)

//         },
//         "json"

//     );
// }

const changestatus = (link) => {
    $.ajax({
        type: "get",
        url: link,
        dataType: "json",
        success: function (data) {
            let { status , id } = data

            let current = $(`#status-` + id)
            let linkNew = current.data('link') + status
            let hr = `javascript:changestatus('${linkNew}')`
            console.log('linkNoStatus:',hr )

            
            //$('.ajax-status').html();
            if(status === 'inactive'){
                current.addClass('btn-danger').html('<i class="fas fa-minus"></i>')
                current.removeClass('btn-success');
                // var oldUrl = current.attr("href"); // Get current url
                // var newUrl = oldUrl.replace(link, hr); // Create new url
                

            }else if(status === 'active'){
                current.addClass('btn-success').html('<i class="fas fa-check"></i>')
                current.removeClass('btn-danger');
            }
            current.attr("href", hr); // Set herf value
            $.notify("Change Status", "success");

            //$('.ajax-status').addClass(className);
            //$('.ajax-status').html('data-current-class', 'btn-success');

        }
    });

}
$('.ordering').change(function (e) { 
    let ordering = $(this).val();
    ordering = $(this).val();
    console.log('ordeing:', ordering)
    let link = $(this).data("link")
    console.log('link:', link)
    let id = $(this).data("id")
    console.log('id:',id )
    $.ajax({
        type: "get",
        url: `${link}change-ordering/${id}/${ordering}`,
        dataType: "json",
        success: function (data) {
            console.log('value:', data)
            $.notify("Change Ordering", "success");

        }
    });
    
});

$(document).ready(function () {

    imgInp.onchange = evt => {
        const [file] = imgInp.files
        if (file) {
          blah.src = URL.createObjectURL(file)
        }
      }

    CKEDITOR.replace('content_ckeditor')
    var ckbAll = $(".cbAll");//dom toi element co class ..
    var fmAdmin = $("#zt-form");

    // CKEDITOR
    if ($('textarea#content_ckeditor').length) {
        CKEDITOR.replace('content_ckeditor');
    }

 

    //call active menu
    activeMenu();

    //check selectbox
    change_form_action("#zt-form .slbAction", "#zt-form", "#btn-action");

    //check all
    ckbAll.click(function () {
        console.log('a')
        $('input:checkbox').not(this).prop('checked', this.checked);
        if ($(this).is(':checked')) {
            $(".ordering").attr("name", "ordering");
        } else {

            $(".ordering").removeAttr("name");
        }

    });
    // hiden notify
    hiddenNotify(".close-btn");



    $("input[name=cid]").click(function () {
        if ($(this).is(':checked')) {
            $(this).parents("tr").find('.ordering').attr("name", "ordering");
        } else {
            $(this).parents("tr").find('.ordering').removeAttr("name");
        }
    });

    // CONFIRM DELETE
    $('a.btn-delete').on('click', () => {
        if (!confirm("Are you sure you want to delete this item?")) return false;
    });

    //active menu function
    function activeMenu() {
        var arrPathname = window.location.pathname.split('/');
        var pattern = (typeof arrPathname[2] !== 'undefined') ? arrPathname[2] : '';

        if (pattern != '') {
            $('#side-menu li a').each(function (index) {
                var subject = $(this).attr("href");
                if (subject != "#" && subject.search(pattern) > 0) {
                    $(this).closest("li").addClass("active");
                    if ($(this).parents("ul").length > 1) {
                        $("#side-menu ul").addClass('in').css("height", "auto");
                        $("#side-menu ul").parent().addClass('active');
                    }
                    return;
                }
            });
        } else {
            $('#side-menu li').first().addClass("active");
        }
    }


    //
    function change_form_action(slb_selector, form_selector, id_btn_action) {

        var optValue;
        var isDelete = false;
        var pattenCheckDelete = new RegExp("delete", "i");

        $(slb_selector).on("change", function () {
            optValue = $(this).val();


            if (optValue !== "") {
                $(id_btn_action).removeAttr('disabled');
            } else {
                $(id_btn_action).attr('disabled', 'disabled');
            }
            $(form_selector).attr("action", optValue);
        });

        $(form_selector + " .btnAction").on("click", function () {
            isDelete = pattenCheckDelete.test($(slb_selector).val());
            if (isDelete) {
                var confirmDelete = confirm('Are you really want to delete?');
                if (confirmDelete === false) {
                    return;
                }
            }

            var numberOfChecked = $(form_selector + ' input[name="cid"]:checked').length;
            if (numberOfChecked == 0) {
                alert("Please choose some items");
                return;
            } else {
                var flag = false;
                var str = $(slb_selector + " option:selected").attr('data-comfirm');

                if (str != undefined) {

                    //Kiểm tra giá trị trả về khi user nhấn nút trên popup
                    flag = confirm(str);
                    if (flag == false) {
                        return flag;
                    } else {
                        $(form_selector).submit();
                    }

                } else {
                    if (optValue != undefined) {
                        $(form_selector).submit();
                    }
                }
            }

        });
    }

    // hidden parent (hidden message notify)
    function hiddenNotify(close_btn_selector) {
        $(close_btn_selector).on('click', function () {
            $(this).parent().css({ 'display': 'none' });
        })
    }

    $('#check-all').change(function () {
        var checkStatus = this.checked;
        $('fmAdmin input[name="checkbox[]"]').each(function () {
            this.checked = this.checkStatus;
        });
        showSelectedRowInBulkAction();
    });

    //$('#form-table input[name="checkbox[]"]').change(function(){
    $('#zt-form input[value="6258430ca870ed08b09ddf3e"]').change(function () {
        // $('input[name="cid"]').change(function(){
        console.log("abc")
        showSelectedRowInBulkAction();
    });

    function showSelectedRowInBulkAction() {
        //let checkbox = $('#form-table input[name="checkbox[]"]:checked');
        let checkbox = $('#zt-form input[value="6258430ca870ed08b09ddf3e"]:checked');
        let navbarBadge = $('#bulk-apply .navbar-badge');
        if (checkbox.length > 0) {
            navbarBadge.html(checkbox.length);
            navbarBadge.css('display', 'inline');
        } else {
            navbarBadge.html('');
            navbarBadge.css('display', 'none');
        }
    }

    $('select[name="group_id"]').change(function(){
        $('input[name="group_name"]').val($(this).find('option:selected').text()); //TH chọn Choose Group: validate đã kiểm tra
    });


});
