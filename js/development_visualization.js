/****************************************************************
* 3D C. Elegans Development
* Melissa Chiasson, Timothy Durham, Andrew Hill
* CSE 512, Spring 2015
* Javascript file to initialize and control visualizations of 
* C. Elegans Development.
****************************************************************/


/****************************************************************
GLOBAL VARIABLES
****************************************************************/
//global highlighting variables
var defaultColor='#a8a8a8';
var selectionColor = '#FFD700';
//boolean value indicates whether this color is currently in use
var highlightColorDefaults = {'#e41a1c':false, '#377eb8':false, '#ff7f00':false, '#f781bf':false};
var highlights = false;

//contains the data for each timepoint/cell
var csvdata = [];

var lineage = undefined;

//contains data points for current gene expression pattern
var exprdata = {};

//mapping of cell name to cell metadata, this metadata is linked to from the 
//'meta' field of the objects in csvdata
var cellmap = {P0: {name:'P0', parent:-1, children: [], selected: false,
                    userselected:false, color: defaultColor}};

//contains objects for progenitor cells preceding time series data
var P0 = {meta: cellmap.P0, pred: -1, succ: []};

//maps cell name to an index into csvdata for each time point
var namemap = [];

//maps cell types to cell names
var celltypes = {};
var cellnames = ['P0', 'AB', 'P1', 'EMS', 'P2', 'P3', 'P4'];
var celldesc = [];
var celltype = [];
var tissuetype = [];

// Wormbase gene map
var wormbase_map = {};

//detect when all time points are loaded
var ready = false;

//blastomere predecessors are not as systematic as their daughters
var blastpred = {P0:'', AB:'P0', P1:'P0', EMS:'P1', P2:'P1',
                 MS:'EMS', E:'EMS', P3:'P2', C:'P2', P4:'P3', 
                 D:'P3', Z2:'P4', Z3:'P4'};

//timepoint counter for automated iteration through time points
var timepoint = 0;

//interval id for playback of development
var playback_id;

//3d variables
var x3d, scene;

//lineage picker idx, for unique ids
var lpidx = 1;

//tree x, y, and radius scales
var treeXScale, treeYScale, treeRadiusScale;

//other variables from scatterplot3D
var axisRange = [-1000, 1000];
var scales = [];
var initialDuration = 0;
var ease = 'linear';
var axisKeys = ["x", "y", "z"];

var load_idx = 0;

// Scale for small multiples plots
var small_multiples_x_scale = null;
var small_multiples_y_scale = null;

// Scale for PCA plot
var pca_scale_x = null;
var pca_scale_y = null;

//variables for speed dropdown
var speedarray = ["slow", "medium", "fast"];
var options = [0,1,2];
var speed = "slow"

// Hiding controls 
controls_hidden = false;

//Gene Expression Globals
var exprPlot_scale;
var gene_names;

/****************************************************************
Lineage Highlighting Functions
****************************************************************/
/**
* This function generates the HTML for a single lineage picker. This template
* is added to the page HTML, but hidden. When a new lineage picker is added by
* clicking the '+' button in the control panel, this template is copied and the
* copy made visible and assigned a unique id.
*/
/*
          <div id="highlighting" class="control-section">
            <h4>Anatomy</h4>
          </div>
          <div id="expression" class="control-section">
            <h4>Gene Expression</h4>

          </div>

*/
function makeLPDivTemplate(){
    var lpsubdiv = d3.select('div.lineage-pickers').append('div')
        .attr('class', 'lineage-picker-template')
        .attr('id', 'lineage-picker-template')
        .attr('style', 'display: none');
    
    //Construct a select box for picking cell lineages/cell types to highlight
    var id = 'selhi'+lpidx;
    var select = lpsubdiv.append('select')
        .attr('class', 'selhi')
        .attr('id', id)
        .attr('data-placeholder', 'Cell lineage/type...')
        .attr('multiple','multiple')
    	.style('overflow', 'scroll');

    select.append('option').attr('value', '');

    var optgroup = select.append('optgroup')
        .attr('label', 'Tissue Type');

    var disp;
    for(var i=0; i < tissuetype.length; i++){
        if(tissuetype[i].length > 50){
            disp = tissuetype[i].substr(0, 50) + '...';
        }else{
            disp = tissuetype[i];
        }
        optgroup.append('option').attr('value', 'tt' + tissuetype[i]).html(disp);
    }

    optgroup = select.append('optgroup')
        .attr('label', 'Cell Type');
       
    for(i=0; i < celltype.length; i++){
        if(celltype[i].length > 50){
            disp = celltype[i].substr(0, 50) + '...';
        }else{
            disp = celltype[i];
        }
        optgroup.append('option').attr('value', 'ct' + celltype[i]).html(disp);
    }

    optgroup = select.append('optgroup')
        .attr('label', 'Cell Description');
        
    for(i=0; i < celldesc.length; i++){
        if(celldesc[i].length > 50){
            disp = celldesc[i].substr(0, 50) + '...';
        }else{
            disp = celldesc[i];
        }
        optgroup.append('option').attr('value', 'cd' + celldesc[i]).html(disp);
    }

    optgroup = d3.select('#'+id).append('optgroup')
        .attr('label', 'Cell Name');
       
    for(i=0; i < cellnames.length; i++){
        if(cellnames[i].length > 50){
            disp = cellnames[i].substr(0, 50) + '...';
        }else{
            disp = cellnames[i];
        }
        optgroup.append('option').attr('value', 'cn' + cellnames[i]).html(disp);
    }
   
    //Make another section to highlight cells based on gene expression
    //Construct a select box for picking genes to highlight
    var id = 'exphi'+lpidx;
    var select = lpsubdiv.append('select')
        .attr('class', 'exphi')
        .attr('id', id)
        .attr('data-placeholder', 'Gene Name/ID...')
        .attr('multiple','multiple')
    	.style('overflow', 'scroll');

    lpsubdiv.append('input')
        .attr('type', 'button')
        .attr('value', '−')
        .attr('class', 'removehi')
        .attr('id', 'removehi'+lpidx)
        .attr('onclick', 'removeLPDiv(event, this);');

    //Construct a select box for picking logic to allow users to customly pick highlghted dataset
    var id = 'loghi'+lpidx;
    lpsubdiv
        .append('small')
        .attr('class', 'picker-heading')
        .attr('id', 'loghead'+lpidx)
        .html('Logic: ');

    var select = lpsubdiv
        .append('select')
        .attr('class', 'loghi')
        .attr('id', id)
        .attr('data-placeholder', 'Set Logic')
	.style('overflow', 'visible');

    select.append('option').attr('value', '');
    outgroup = d3.select('#'+id).append('optgroup')
    outgroup.append('option').attr('value','union').attr('selected', 'selected').html('OR');
    outgroup.append('option').attr('value','intersect').html('AND');
    outgroup.append('option').attr('value', 'not').html('NOT');

    var id = 'hicolor'+lpidx;

    lpsubdiv
        .append('small')
        .attr('class', 'picker-heading')
        .attr('id', 'hihead'+lpidx)
        .html('Color: ');

    lpsubdiv.append('input')
        .attr('type', 'color')
        .attr('class', 'hicolor')
        .attr('id', id);

    lpidx++;
}

/**
* This function removes a lineage picker div section.
* @param {Javascript event} e - Javascript event (not used in the function)
* @param {HTML element} obj - element on which the event was called (a lineage
*                             picker div in this case)
* @callback - This function is a callback for the '-' button in a set of lineage
*             picker controls
*/
function removeLPDiv(e, obj) {
    var defcolor = $(obj).parent().children('.hicolor').attr('defaultValue');
    highlightColorDefaults[defcolor] = false;
    $(obj).parent().remove();
    $("#add-lp").prop("disabled", false);
    
    // Restore color of + button
    $('#add-lp').removeAttr('style');
}

/**
* This function copies the lineage picker template (makeLPDivTemplate() must be
* called first to set up this template), gives the copy a unique id, and sets
* the display CSS attribute to 'block' so that the copied controls are visible.
*/
function cloneLPDiv(){
    var highlightCount = $('.lineage-pickers').children().length
    if(highlightCount < 5){
        // Automatically set the new color picker's default color and record
        // that default as used by setting its value to true
        for(var highlight_color in highlightColorDefaults){
            if(!highlightColorDefaults[highlight_color]){
                highlightColorDefaults[highlight_color] = true;
                break;
            }
        }
        d3.select('#hicolor' + 1)
            .attr('value', highlight_color)
            .attr('defaultValue', highlight_color);

        var lpdivclone = $('#lineage-picker-template').clone(true);

        lpdivclone.attr('id', 'lineage-picker'+lpidx)
            .attr('class', 'control-section')
            .attr('style', 'display: block');
        var childs = [];
    lpdivclone.children().each(function(idx){
        childs.push(this);
//      if($(this).is('div')){
//      $(this).children().each(function(idx2){
//          childs.push(this);
//      });
//      }
    });
    console.log(childs.length);
        var id;
    var id_type;
        for(var i = 0; i < childs.length; i++){
            id = $(childs[i]).attr('id');
        id_type = id.substr(0, id.length - 1);
            $(childs[i]).attr('id', id_type + lpidx);
        $(childs[i]).attr('name', lpidx + '.' + id_type);
        }

        lpdivclone.appendTo('.lineage-pickers');
        $('#selhi'+lpidx).chosen({search_contains:true, width: "175px", display: "inline-block"});
        $('#loghi'+lpidx).chosen({search_contains:true, width: "75px", display: "inline-block"});
    $('#exphi'+lpidx).chosen({search_contains:true,  width: "175px", display: "inline-block"});

    $('#exphi'+lpidx+'_chosen').find('input[type=text]:first').autocomplete({
        minLength: 2,
        source: function( request, response ) {
	    $('ul.chosen-results').append('<li class="active-result text-center" id="autocomp_spinner"><img src=img/ajax-loader.gif></li>');
            console.log($(this));
            console.log($($(this)[0].element[0]).parents('.chosen-container:first').attr('id'));
            var sel_id = $($(this)[0].element[0]).parents('.chosen-container:first').attr('id');
            var sel_obj = $('#'+sel_id.split('_'));
            var to_keep = $('#'+sel_id).find('li.search-choice');
            var to_keep_genes = [];
	    //      var to_rm = $('option.expropt');
            var to_rm = sel_obj.find('option.expropt');
            console.log(to_rm);
            $.ajax({
		url: url_base + "/cgi-bin/get_genes.py?term="+encodeURIComponent(request.term),
		dataType: "json",
		beforeSend: function(){
		    console.log(to_rm.length);
		    to_rm.remove();
		    to_keep.each(function(idx){
			var gene_id = $(this).text();
			to_keep_genes.push(gene_id);
		    });
		}
            }).done(function( data ) {
		$('#autocomp_spinner').remove();
		to_keep_genes.forEach(function(gene_id){
		    console.log('KEEP: '+gene_id);
		    var toadd = '<option class="expropt" id="' + gene_id + '" value="' + gene_id + '" selected>' + gene_id + '</option>';
		    sel_obj.append(toadd);
		});
		$.map( data, function( item ) {
		    if(!to_keep_genes.includes(item)){
			console.log('autocomplete match: '+item);
			var toadd = '<option class="expropt" id="' + item + '" value="' + item + '">' + item + '</option>';
			console.log('NEW: '+toadd);
			sel_obj.append(toadd);
		    }
		});
		response();
		sel_obj.trigger("chosen:updated");
            });
        }
    });

    lpidx++;

        //only allow up to 4 sets of lineage picker controls
        if($('#lineage-pickers').children().length === 4){
            $('#add-lp').prop('disabled', true);
        }
    }

    // Grey out the button when too many highlights are added
    if (highlightCount >= 4) {
        $('#add-lp').css('background-color', '#D3D3D3').css('border-color', '#D3D3D3')
    }
}

/**
* This function will make non-highlighted cells invisible in the 3D plot.
* @param {string} showhide - value of the Show/Hide Non-Highlighted button
*
* @callback - This function is a callback fired when the Show/Hide 
*             Non-Highlighted button is clicked.
*/
function showHideHighlights(showhide){
    //here, show means hide and hide means show
    var datapoints = scene.selectAll('.datapoint')
    if(showhide.substr(0,4) === 'Show'){
        datapoints.filter(function(d){return lineage[d.name].selected ? null : this;})
            .selectAll('shape appearance material')
            .attr('transparency', '1');
    }else{
        datapoints.selectAll('shape appearance material')
            .attr('transparency', '0');
    }
}

/**
* This function is called as the visualization is loading to set up the lineage
* picker controls. It calls makeLPDivTemplate(), cloneLPDiv(), and then sets up
* the the buttons to add LP controls and to show or hide non-highlighted cells.
*/
function initializeLineagePicker(){
    d3.select('#highlighting')
        .append('div').attr('class', 'lineage-pickers');
    makeLPDivTemplate();
    cloneLPDiv();
}

/**
* Takes an array of cells for a particular time point (i.e. an element from 
* csvdata), concatenates the names of the cells present at this time point with
* '.' delimiters, and then calls cellNameStr() to add the blastomere name(s) for
* the cells that are present. Returns this string of '.'-delimited cell names.
* This produces a string such that any cell present at this time point or any 
* ancestor of such a cell can be identified by simply querying the cell name
* against this string with .indexOf(<cellname>)
* @param {string} timepoint - array from csvdata corresponding to a particular
*                             timepoint
* @returns {string} - a string of '.'-delimited cell names that contains all 
*                     leaf cells at this time point, and, by virtue of the 
*                     C. elegans cell naming convention, names of all ancestors
*                     of leaf cells at this time point.
*/
function timePointCellNames(timepoint){
    var timepoint_str = $.map(timepoint, function(elt, idx){return elt.name;}).join('.');
    return '.'+timepoint_str;
//This is the original return statement; it is commented out for development
//    return cellNamesStr('.'+timepoint_str);
}

/**
* Takes a string of cell names (delimited with '.', as from timePointCellNames),
* finds the blastomere prefixes on these cell names, concatenates these 
* blastomere names with '.' delimiters, and adds this blastomere string to the 
* string of cell names. This is necessary because the blastomere naming does
* not follow branch cell naming conventions (e.g. EMS is the parent of the E and
* MS branches).
* @param {string} cellstr - '.'-delimited cell name string, as generated by
*                           timePointCellNames()
* @returns {string} - a '.'-delimited cell name string with blastomere names
*                     added
*/
function cellNamesStr(cellstr){
    var regex = /\.(P0|AB|P1|EMS|P2|E|MS|C|P3|D|P4|Z2|Z3)/g;
    var blast_list = cellstr.match(regex);
    blast_list = blast_list.filter(onlyUnique);
    var blast_str = '';
    for (var i=1; i < blast_list.length; i++){
        blast_str += _cellnamesStrHelper(cellmap[blast_list[i].substr(1)]);
    }
    return blast_str + cellstr + '.';
}

/**
* Filtering function to return only unique entries in the list.
* Based on http://stackoverflow.com/questions/1960473/unique-values-in-an-array
* @param {list element} value - value to search the list for
* @param {int} index - current index for the list.filter() method
* @param {list} self - list being filtered by this function
* @returns {boolean} - whether the current element is the first time this value
*                      has been encountered in the list. The filtering function
*                      will throw away any subsequent identical values (they 
*                      will cause this function to return false instead of true)
*/
function onlyUnique(value, index, self){
    return self.indexOf(value) === index;
}

/**
* Recursively build a string of cell names by appending names of parent cells
* to a growing '.'-delimited string. This can work on any cell metadata object
* present in cellmap, but in practice is used to resolve blastomere parents, as
* blastomere naming conventions do not follow the convenient progressive names
* of their children.
* @param {cellmap object} obj - object from cellmap representing a cell in the 
*                               C. elegans lineage tree
* @returns {string} - '.'-delimited string of cell names of the provided cell 
*                     and all ancestors.
*/
function _cellnamesStrHelper(obj){
    if (obj.parent === -1){
        return '.' + obj.name;
    }else{
        return _cellnamesStrHelper(obj.parent) + '.' + obj.name;
    }
}

/**
* Produces an object mapping blastomere names to concatenated lineage suffixes.
* The role of this function is very similar to that of cellNameStr(), but it 
* tries to handle the blastomere/branch cell distinction more explicitly. This 
* avoids EMS bugs in which the E cell gets highlighted when the EMS cell is 
* present in a selection.
* @param {string} cellname - The name of a cell in the lineage tree.
* @returns {object} - a javascript object mapping blastomere names as keys to
*                     strings of concatenated branch cell suffixes as values.
*                     To check if any cell is an ancestor, match that cell's
*                     branch suffix (lower case letters in a branch cell's name)
*                     to the concatenated suffix string of the corresponding 
*                     blastomere (capital letters in the cell name) using 
*                     .indexOf()
*/
function cellLineageStr(cellname){
    var lineage_obj = {};
    _cellLineageStrHelper(lineage_obj, cellname, '');
    return lineage_obj;
}

/**
* Helper function for cellLineageStr() that recursively builds the cell name-
* based lineage_obj
* @param {object} lineage_obj - object mapping blastomere names (i.e. 
*                               capitalized part of cell names) to strings of 
*                               concatenated branch suffixes (i.e. lower case 
*                               part of cell names)
* @param {string} cellname - the name of a cell in the lineage tree
*/
function _cellLineageStrHelper(lineage_obj, cellname, prev_name){
    var cell = cellmap[cellname];
    var regex = /^(AB|E|MS|C|D)([aplrdv]+)/;
    if(cell.children){
        for(var i=0; i < cell.children.length; i++){
            var child = cell.children[i];
            _cellLineageStrHelper(lineage_obj, child.name, cellname);
        }
    }
    //the non-blastomere name will be the second group matched
    var matchres = regex.exec(cell.name);
    //this must be a pre-blastomere (or random Nuc*** cell), so just add it as itself
    if(matchres === null){
        if(cell.name in lineage_obj){
            lineage_obj[cell.name].push(cell.name);
        }else{
            lineage_obj[cell.name] = [cell.name];
        }
    }else{
        var blast = matchres[1], lineagestr = matchres[2];
        //if this is a blastomere (AB, E, MS, C, or D) just set it as itself
        if(blast === cell.name){
            lineage_obj[blast] = [blast];
        //otherwise, add the lineage suffix to the corresponding blastomere string
        }else if(blast in lineage_obj){
            lineage_obj[blast].push(lineagestr);
        }else{
            lineage_obj[blast] = [lineagestr];
        }
    }
}

function pickColor_and_setSelected(){
    Object.values(lineage).forEach(function(lin_obj, index1){
	if(lin_obj.color_by_tp != false){
	    lin_obj.color_by_tp.forEach(function(item, index2){
		if(item[0] <= tpdata[cur_tpdata_idx][0].tp){
		    lin_obj.selected = true;
		    lin_obj.color = item[1];
		}else{
		    lin_obj.selected = false;
		    lin_obj.color = defaultColor;
		}
	    });
	}
    });
}

/**
* Function to set cell colors in the 3D plot and lineage tree based on the
* 'color' entry in each cells metadata in the cellmap
* @callback - called whenever a lineage picker selection is changed
*/
/*
function updateCellColors_orig(){
    d3.selectAll('.dp_sphere appearance material')
        .attr('diffuseColor', function(d){return lineage[d.name].color;});
    d3.selectAll('.small_multiples_datapoint_xy')
        .attr('fill', function(d){return lineage[d.name].color;});
    d3.selectAll('.small_multiples_datapoint_yz')
        .attr('fill', function(d){return lineage[d.name].color;});
    d3.selectAll('.small_multiples_datapoint_xz')
        .attr('fill', function(d){return lineage[d.name].color;});
    d3.selectAll('.pca_datapoint')
        .attr('fill', function(d){return lineage[d.name].color;});
}

function updateCellColors(){
    d3.selectAll('.dp_sphere appearance material')
        .attr('diffuseColor', function(d){return lineage[d.name].color;});
    d3.selectAll('.small_multiples_datapoint_xy')
        .attr('fill', function(d){return lineage[d.name].color;});
    d3.selectAll('.small_multiples_datapoint_yz')
        .attr('fill', function(d){return lineage[d.name].color;});
    d3.selectAll('.small_multiples_datapoint_xz')
        .attr('fill', function(d){return lineage[d.name].color;});
    d3.selectAll('.pca_datapoint')
        .attr('fill', function(d){return lineage[d.name].color;});
}
*/

/**
* Function to update the visualization after a user submits a new selection
* for highlighting in the visualization. This functionality will roughly
* replace the setCellColors() function.
*/
function setSelection(){
    //disable the submit button
    $('#submitSelection').prop('disabled', true)
	.css('background-color', '#D3D3D3')
	.css('border-color', '#D3D3D3');
    //use jQuery BlockUI Plugin to put loading spinner over plots
    $('#divPlot').block({message: '<div id="loading_spinner"></div>'});
    //bind info from selection form to FormData object
    var form = document.querySelector("form");
    var fd = new FormData(form);
    //make XMLHTTPRequest to get selection info for each cell
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
	    var selected = JSON.parse(xhr.responseText);
	    //Deselect all cells
	    Object.keys(lineage).forEach(function(key, index){
		lineage[key].color = defaultColor;
		lineage[key].color_by_tp = false;
		lineage[key].selected = false;
		lineage[key].priv_selected = false;
	    });
	    highlights = false;
	    var selected_flat = [];
	    for (var i=0; i < selected.length; i++){
		//each selected element is (cellname, {tp:color list})
		var sel = selected[i];
		if(lineage[sel[0]] === undefined){
		    continue;
		}
		lineage[sel[0]].priv_selected = true;
		//		lineage[sel[0]].selected = true;
		sel[1].forEach(function(tp_elt, tp_elt_idx){
		    var tp_val = tp_elt[0];
		    var colors = tp_elt[1];
		    if(colors.length > 1){
			colors.forEach(function(col, col_idx){
			    colors[col_idx] = $.Color(col);
			});
			sel[1][tp_elt_idx] = [tp_val, Color_mixer.mix(colors).toHexString()];
		    }else{
			sel[1][tp_elt_idx] = [tp_val, colors[0]];
		    }
		    selected_flat.push([sel[0], tp_val, sel[1][tp_elt_idx][1]]);
		});
		lineage[sel[0]].color_by_tp = sel[1];
		highlights = true;
	    }
	    //update lineage tree with new selection
	    var tree_paths = paths_container.selectAll('.highlight_treeln_path')
		.data(selected_flat, function(d){return d[0] + '_' + d[1] + '_' + d[2];});
	    tree_paths.exit().remove();
	    tree_paths.enter().append('path')
		.attr('id', function(d){return d[0] + '_' + d[1] + 'highlight_treeln_path';})
		.attr('class', 'highlight_treeln_path')
		.attr('d', function(d){
		    var dobj = lineage[d[0]];
		    var parent = lineage[dobj.parent_name];
		    if((d[0] != 'P0') && ((d[1] == 0) || (d[1] == dobj.birth))
		       && parent.priv_selected === true){
			var path_fmt = 'M{0} {1} L{2} {3} V{4}';
			return path_fmt.format(newtree_x_scale_orig((parent.lft + parent.rgt)/2),
					       newtree_y_scale_orig(parent.death),
					       newtree_x_scale_orig((dobj.lft + dobj.rgt)/2),
					       newtree_y_scale_orig(dobj.birth),
					       newtree_y_scale_orig(dobj.death));
		    }else{
			var path_fmt = 'M{0} {1} V{2}';
			return path_fmt.format(newtree_x_scale_orig((dobj.lft + dobj.rgt)/2),
					       newtree_y_scale_orig(d[1] ? d[1] : dobj.birth),
					       newtree_y_scale_orig(dobj.death));
		    }
		})
		.attr('stroke', function(d){return d[2];})
		.attr('fill', 'none');

	    //set the correct coloring and selected status for the cells at this timepoint
	    pickColor_and_setSelected();
	    //update the rest of the viz
	    plotData(0);
	    //unblock the plots
	    $('#divPlot').unblock();
	    //re-enable the submit button
	    $('#submitSelection').prop('disabled', false).removeAttr('style');
	}
    };
    // Set up our request
    xhr.open("POST", url_base+"/cgi-bin/get_lineage.py", true);
    // The data sent is what the user provided in the form
    xhr.send(fd);
};

/**
* update the plots to have the correct highlights when changes are made in 
* lineage picker selections
* @callback - final function called when the lineage picker selections are 
*             changed
*/
function updatePlot(){
    var ppbutton = document.getElementById('playpause');
    var playpause = false;
    if(ppbutton.innerHTML === '▌▌'){
        playpause = true;
        playpausedev();
    }

//    plotData(timepoint, 0);
    plotData(0);
    if(playpause){
        playpausedev();
    }
}

/**
* Function to load in the mapping of leaf nodes (cell names) to cell 
* descriptions, cell types, and tissue types. These are hierarchical 
* characterizations of the roles that cells play in the adult worm, and they are
* used in the lineage picker select boxes to highlight cells based on what 
* tissue or function they have in their fully differentiated state. This 
* function reads in these metadata values and maps them to concatenated names
* of cells so that cells that correspond to a particular cell/tissue type can be
* found by simply querying the cell name against the concatenation with 
* the .indexOf() string method.
*/
function loadCellTypeMap(){
    d3.text('waterston_celltypes_filtered.csv', function (csvtext){
        //read all the cell types in
        var rows = d3.csv.parseRows(csvtext);

        for(var i=0; i < rows.length; i++){
            var row = rows[i];
            var cellname = row[0];
            cellnames.push(cellname);
            var n;
            if(cellname.substr(0,3) == 'EMS'){
                n = 3;
            }else if(cellname.substr(0,1) === 'E' || cellname.substr(0,1) === 'C' || cellname.substr(0,1) === 'D'){
                n = 1;
            }else{
                n = 2;
            }
            for(n; n <= cellname.length; n++){
                var prev = cellname.substr(0, n);
                if(cellnames.indexOf(prev) === -1){
                    cellnames.push(prev);
                }
            }
            if(cellname.substr(0,2) == 'MS'){
                cellname = 'E' + cellname;
            }else if(cellname.substr(0,1) == 'E'){
                cellname = 'EMS' + cellname;
            }else if(cellname.substr(0,1) == 'C'){
                cellname = 'P2' + cellname;
            }else if(cellname.substr(0,1) == 'D'){
                cellname = 'P2P3' + cellname;
            }else if(cellname.substr(0,2) == 'P3'){
                cellname = 'P2' + cellname;
            }else if(cellname.substr(0,2) == 'P4'){
                cellname = 'P2P3' + cellname;
            }else if(cellname.substr(0,1) == 'Z'){
                cellname = 'P2P3P4' + cellname;
            }
            for(var ct_idx=4; ct_idx < 7; ct_idx++){
                var ct = row[ct_idx];
                if(!(ct in celltypes)){
                    celltypes[ct] = '';
                }
                celltypes[ct] += cellname;
                if(ct_idx == 4 && celldesc.indexOf(ct) === -1){
                    celldesc.push(ct);
                }else if(ct_idx == 5 && celltype.indexOf(ct) === -1){
                    celltype.push(ct);
                }else if(ct_idx == 6 && tissuetype.indexOf(ct) === -1){
                    tissuetype.push(ct);
                }
            }
        }
        //set up filter-able drop-down box
        cellnames.sort();
        celldesc.sort();
        celltype.sort();
        initializeLineagePicker();
            // TODO this is here temporarily -- will be moved once updating of the tree is
            // implemented
//            var root = getTreeRootFromTimepoints(csvdata, csvdata.length - 1);
//            initializeLineageTree(root);
        initializePlot();
        initializePCA();
        initializeSmallMultiples();
	initializeLineageTree2();
//        initializeGeneExpressionPlot();
//        initializeLineageTree(cellmap.P0);
//        plotData(0, 5);
    });
}

/****************************************************************
 USER NODE SELECTION
****************************************************************/
/**
* Set the userselected attribute of a cell in the cellmap when a user clicks on 
* that cell, call userSelectPoints to add/remove highlights to the corresponding
* data point in the 3D plot and node in the lineage tree
* @param {string} cellname - the name of a cell that the user clicked on
* @callback - called when a user clicks on a 3D plot data point or a lineage 
*             tree node.
*/
function clickSelect(cellname){
    lineage[cellname].userselected = !lineage[cellname].userselected;
    var selection = [cellname];
    userSelectPoints(selection);
}

/**
* This function adds or removes outlines to user-selected or -deselected nodes
* @param {list} selection - list of cell name strings for cells that should have
*                           their user selections toggled
*/
function userSelectPoints(selection){
    //3Dplot
    d3.selectAll('.datapoint')
        .filter(function(d){return selection.indexOf(d.name) > -1 ? this : null;})
        .selectAll('billboard').remove();
    var sdata = d3.selectAll('.datapoint')
        .filter(function(d){return selection.indexOf(d.name) > -1 &&  lineage[d.name].userselected ? this : null;});
    var user_highlight = sdata.append('billboard').attr('axisOfRotation', '0 0 0').append('shape');
    var appearance = user_highlight.append('appearance');
    appearance.append('material')
        .attr("emissiveColor", selectionColor)
        .attr("diffuseColor", selectionColor);
    user_highlight.append('Disk2D')
        .attr('innerRadius', '1')
        .attr('outerRadius', '1.4')
        .attr('solid', 'true')
        .attr('ccw', 'true')
        .attr('useGeoCache', 'true')
        .attr('lit', 'true')
        .attr('subdivision', '32');

    //lineage tree
    d3.selectAll('.node')
        .filter(function(d){return selection.indexOf(d.name) > -1 ? this : null;})
        .selectAll('.node-select').remove();
    var snode = d3.selectAll('.node')
        .filter(function(d){return selection.indexOf(d.name) > -1 && lineage[d.name].userselected ? this : null;})
        .append('circle')
        .attr('class', 'node-select')
        .attr("r", 8)
        .attr("fill", "none")
        .attr('stroke', selectionColor)
        .attr('stroke-width', '2')
        .attr("transform", function(d) { 
            return "translate(" + 0 + "," + d.y + ")"; }) // 0 is required for x to make edges match up with nodes
        .call(position_node)
        .call(scale_radius, 6, 0.5);

    //small_multiples
    d3.selectAll('.small_multiples_datapoint')
        .filter(function(d){return selection.indexOf(d.name) > -1 ? this : null;})
        .attr('stroke', 'none')

    var snode = d3.selectAll('.small_multiples_datapoint')
        .filter(function(d){return selection.indexOf(d.name) > -1 && lineage[d.name].userselected ? this : null;})
        .attr('stroke', selectionColor)
        .attr('stroke-width', '2')

    // PCA
    d3.selectAll('.pca_datapoint')
        .filter(function(d){return selection.indexOf(d.name) > -1 ? this : null;})
        .attr('stroke', 'none')

    var snode = d3.selectAll('.pca_datapoint')
        .filter(function(d){return selection.indexOf(d.name) > -1 && lineage[d.name].userselected ? this : null;})
        .attr('stroke', selectionColor)
        .attr('stroke-width', '2')

    // PCA
    d3.selectAll('.exprPlot_data_point')
        .filter(function(d){return selection.indexOf(d.name) > -1 ? this : null;})
        .attr('stroke', 'none')


    d3.selectAll('.exprPlot_data_point')
        .filter(function(d){return selection.indexOf(d.name) > -1 ? this : null;})
        .selectAll('.expr-plot-node-select').remove();

    var snode = d3.selectAll('.exprPlot_data_point')
        .filter(function(d){return selection.indexOf(d.name) > -1 && lineage[d.name].userselected ? this : null;})
        .insert('rect', ':first-child')
        .attr('class', 'expr-plot-node-select')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', selectionColor)
        .attr('x', 0)
        .attr('y', 0)
}

/****************************************************************
GRAPHICAL HELPER FUNCTIONS FOR 3D DEVELOPMENT PLOT
****************************************************************/

/**
* TODO maybe add some to description: Used to make 2d elements visible
* @param {TODO type} selection - TODO description
* @param {TODO type} color - TODO description
*/
function makeSolid(selection, color) {
    selection.append("appearance")
        .append("material")
        .attr("diffuseColor", color||"black")
    return selection;
}

/**
* TODO maybe add some to description: Initialize the axes lines and labels.
*/
function initializePlot() {
    initializeAxis(0);
    initializeAxis(1);
    initializeAxis(2);
}

/**
* TODO add description
* @param {TODO type} selection - TODO description
*/
function constVecWithAxisValue( otherValue, axisValue, axisIndex ) {
    var result = [otherValue, otherValue, otherValue];
    result[axisIndex] = axisValue;
    return result;
}

/**
* TODO add description
* @param {TODO type} axisIndex - TODO description
*/
function initializeAxis( axisIndex ){
    var key = axisKeys[axisIndex];
    drawAxis( axisIndex, key, initialDuration );

    var scaleMin = axisRange[0];
    var scaleMax = axisRange[1];

    // the axis line
    var newAxisLine = scene.append("transform")
        .attr("class", axisKeys[axisIndex])
        .attr("rotation", ([[0,0,0,0],[0,0,1,Math.PI/2],[0,1,0,-Math.PI/2]][axisIndex]))
        .append("shape")
    newAxisLine
        .append("appearance")
        .append("material")
        .attr("emissiveColor", "lightgray")
    newAxisLine
        .append("polyline2d")
         // Line drawn along y axis does not render in Firefox, so draw one
         // along the x axis instead and rotate it (above).
        .attr("lineSegments", scaleMin * 0.4 + " 0," + scaleMax * 0.4 + " 0")
    
    // axis labels
    var labels = {'0':['Anterior', 'Posterior'],
                  '1':['Ventral', 'Dorsal'],
                  '2':['Right', 'Left']
                  };
    var labelFontSize = 60;

    var newAxisLabel = scene.append("transform")
        .attr("class", 'axis-label')
        .attr("translation", constVecWithAxisValue( 0, scaleMin*0.42, axisIndex));

    var newAxisLabelShape = newAxisLabel
        .append("billboard")
            .attr("axisOfRotation", "0 0 0") // face viewer
        .append("shape")
            .call(makeSolid)

    newAxisLabelShape
        .append("text")
            .attr("class", 'axis-label-text')
            .attr("solid", "true")
            .attr("string", labels[axisIndex][0])
        .append("fontstyle")
            .attr("size", labelFontSize)
            .attr("family", "SANS")
            .attr("justify", "END MIDDLE" )

    newAxisLabel = scene.append("transform")
        .attr("class", 'axis-label')
        .attr("translation", constVecWithAxisValue( 0, scaleMax*0.42, axisIndex));

    newAxisLabelShape = newAxisLabel
        .append("billboard")
            .attr("axisOfRotation", "0 0 0") // face viewer
        .append("shape")
            .call(makeSolid)

    newAxisLabelShape
        .append("text")
            .attr("class", 'axis-label-text')
            .attr("solid", "true")
            .attr("string", labels[axisIndex][1])
        .append("fontstyle")
            .attr("size", labelFontSize)
            .attr("family", "SANS")
            .attr("justify", "END MIDDLE" )
}

/**
* TODO maybe add some to description: Assign key to axis, creating or updating its ticks, grid lines, and labels.
* @param {TODO type} selection - TODO description
*/
function drawAxis( axisIndex, key, duration ) {
    var scale = d3.scale.linear()
        .domain( [-1000,1000] ) // demo data range
        .range( axisRange )
    
    scales[axisIndex] = scale;
}

/**
* Plots data in the 3D view. Determines show/hide status of points and adds popover text to each cell.
* @param {d3 data selection} to_plot - A set of datapoints from d3, typically the enter() set so new points are plotted.
* @returns {d3 data selection} - a selection containing shape elements appended 
*                                to the to_plot selection. Used later in 
*                                plotData() to identify the names of the newly
*                                plotted cells, which are then used in plotting
*                                the lineage tree.
*/
function plot3DView(enter_selection){
    var x = scales[0], y = scales[1], z = scales[2];
    // Draw a sphere at each x,y,z coordinate.
    var new_data = enter_selection.append('transform')
        .attr('translation', function(d){
            return x(d.pred_x) + " " + y(d.pred_y) + " " + z(d.pred_z);
        })
        .attr('class', 'datapoint')
        .attr('id', function(d){return d.name})
        .attr('scale', function(d){
            if(lineage[d.name].selected || !highlights){
                var ptrad = d.radius * 0.5; 
                return [ptrad, ptrad, ptrad];
            }else{
                return [5, 5, 5];
            }
        })
        .attr('onclick', '(function(e, obj) {clickSelect(obj.__data__.name);})(event, this);');

    var showhide = document.getElementById('showhide-highlight').value;
    var transp = 0;
    if(showhide.substr(0,4) === 'Show'){
        transp = 1;
    }
    //finish generating data points
    new_data = new_data.append('shape')
        .attr('class', 'dp_sphere');
    new_data.append('appearance').append('material')
        .attr('transparency', function(d){
            if(lineage[d.name].selected || !highlights){
                return 0;
            }else{
                return transp;
            }
        })
        .attr('diffuseColor', function(d){
            return lineage[d.name].color;
        });
    new_data.append('sphere')

    // Add attribute for popover text
        .attr('data-toggle', 'popover')
        .attr('title', function(d) {return d.name})
        .attr('data-content', function(d) {return '<b>x:</b> ' + Math.round(d.x * 10000) / 10000 + '<br />' + '<b>y:</b> ' + Math.round(d.y * 10000) / 10000 + '<br />' + '<b>z:</b> ' + Math.round(d.z * 10000) / 10000 + '<br />'})
        .attr('data-trigger', 'hover')
        .attr('data-placement', 'bottom')
        .attr('data-html', 'true');

    // Add the popover behavior for cells
    $(document).ready(function(){
        $('sphere').popover();   
    });
}

function updatePlot3D(update_selection, duration){
    var x = scales[0], y = scales[1], z = scales[2];
    update_selection
	.attr('translation', function(d){
            return x(d.pred_x) + " " + y(d.pred_y) + " " + z(d.pred_z);
	})
	.attr('scale', function(d){
            if(lineage[d.name].selected || !highlights){
                var ptrad = d.pred_r * 0.5; 
                return [ptrad, ptrad, ptrad];
            }else{
                return [5, 5, 5];
            }
        })
    var showhide = document.getElementById('showhide-highlight').value;
    var transp = showhide.substr(0,4) === 'Show' ? 1 : 0;
    //finish generating data points
    update_selection.selectAll('material')
        .attr('transparency', function(d){
            if(lineage[d.name].selected || !highlights){
                return 0;
            }else{
                return transp;
            }
        })
        .attr('diffuseColor', function(d){
            return lineage[d.name].color;
        });
    //execute transition
    update_selection.transition().ease(ease).duration(duration)
        .attr("translation", function(row) {
            return x(row.x) + " " + y(row.y) + " " + z(row.z);
        })
	.attr('scale', function(row){
	    if(lineage[row.name].selected || !highlights){
		var ptrad = row.radius * 0.5;
		return [ptrad, ptrad, ptrad];
	    }else{
		return [5,5,5];
	    }
	});
}

/**
* Initializes axes for the 3 small multiples plots as XY, XZ, and YZ plots. These are appended to the #divPlot div.
*/
function initializeSmallMultiples() {
    var width = $('#small_multiples').width(),
    height = Math.floor($('#small_multiples').height()/3);
    var scaleSet = Math.min(width, height);

    var xmargin = (width - scaleSet)/2;
    small_multiples_x_scale = d3.scale.linear()
        .domain([-300, 300])
        .range([0 + xmargin, width - xmargin]);

    var ymargin = (height - scaleSet)/2;
    small_multiples_y_scale = d3.scale.linear()
	.domain([-300, 300])
	.range([0 + ymargin, height - ymargin]);
 
    // Make the axes for the x-y chart
    var xyChart = d3.select('#small_multiples')
	.append('svg:svg')
	.attr('width', '100%')
	.attr('height', '33%')
	.attr('class', 'small_multiples_chart')
	.attr('id', 'xyChart')
	.attr('onclick', 'setViewpoint("side_view")')

    var main = xyChart.append('g')
	.attr('class', 'main')   
    
    var g = xyChart.append("svg:g")
        .attr('id', 'xy_data_points');

    // Make the axes for the x-z chart
    var xzChart = d3.select('#small_multiples')
	.append('svg:svg')
	.attr('width', '100%')
	.attr('height', '33%')
	.attr('class', 'small_multiples_chart')
	.attr('id', 'xzChart')
	.attr('onclick', 'setViewpoint("top_view")')

    var main = xzChart.append('g')
        .attr('class', 'main')   

    var g = main.append("svg:g")
        .attr('id', 'xz_data_points');

    // Make the axes for the x-z chart
    var yzChart = d3.select('#small_multiples')
	.append('svg:svg')
	.attr('width', '100%')
	.attr('height', '33%')
	.attr('class', 'small_multiples_chart')
	.attr('id', 'yzChart')
	.attr('onclick', 'setViewpoint("back_view")')

    var main = yzChart.append('g')
        .attr('class', 'main')   

    var g = main.append("svg:g")
        .attr('id', 'yz_data_points');
}

/**
* Plots points on the XY small multiple axis. initializeSmallMultiples must be called first.
* @param {d3 data selection} to_plot - A set of datapoints from d3, typically the enter() set so new points are plotted.
*/
function plotXYSmallMultiple(enter_selection) { 
    enter_selection.append("svg:circle")
        .attr('class', 'small_multiples_datapoint_xy')
        .attr('id', function(d){return d.name})
}

function updateXYSmallMultiple(update_selection, duration){
    update_selection
	.attr('r', function(d){
	    if(lineage[d.name].selected || !highlights){
		return d.pred_r/15;
	    }else{
		return d.pred_r/25;
	    }
	})
	.attr('fill', function(d){return lineage[d.name].color;})
        .attr('opacity', 0.8)
        .attr("cx", function (d) { return small_multiples_x_scale(d.pred_x); } )
        .attr("cy", function (d) { return small_multiples_y_scale(-d.pred_y); } )
	.transition().ease(ease).duration(duration)
        .attr("cx", function(row) {return small_multiples_x_scale(row.x);})
        .attr("cy", function(row) {return small_multiples_y_scale(-row.y);})
	.attr('r', function(d) {
	    return (lineage[d.name].selected || !highlights) ? d.radius/15 : d.radius/25;
	});
}

/**
* Plots points on the XZ small multiple axis. initializeSmallMultiples must be called first.
* @param {d3 data selection} to_plot - A set of datapoints from d3, typically the enter() set so new points are plotted.
*/
function plotXZSmallMultiple(enter_selection) { 
    enter_selection.append("svg:circle")
        .attr('class', 'small_multiples_datapoint_xz')
        .attr('id', function(d){return d.name});
}

function updateXZSmallMultiple(update_selection, duration){
    update_selection
	.attr('r', function(d){
	    if(lineage[d.name].selected || !highlights){
		return d.pred_r/15;
	    }else{
		return d.pred_r/25;
	    }
	})
	.attr('fill', function(d){return lineage[d.name].color;})
        .attr('opacity', 0.8)
	.attr('cx', function(d){return small_multiples_x_scale(-d.pred_z);})
	.attr('cy', function(d){return small_multiples_y_scale(d.pred_x);})
	.transition().ease(ease).duration(duration)
        .attr("cx", function(row) {return small_multiples_x_scale(-row.z);})
        .attr("cy", function(row) {return small_multiples_y_scale(row.x);})
	.attr('r', function(d) {
	    return (lineage[d.name].selected || !highlights) ? d.radius/15 : d.radius/25;
	});
}

/**
* Plots points on the YZ small multiple axis. initializeSmallMultiples must be called first.
* @param {d3 data selection} to_plot - A set of datapoints from d3, typically the enter() set so new points are plotted.
*/
function plotYZSmallMultiple(enter_selection){
    enter_selection.append("svg:circle")
        .attr('class', 'small_multiples_datapoint_yz')
        .attr('id', function(d){return d.name});
}

function updateYZSmallMultiple(update_selection, duration){
    update_selection
	.attr('r', function(d){
	    if(lineage[d.name].selected || !highlights){
		return d.pred_r/15;
	    }else{
		return d.pred_r/25;
	    }
	})
	.attr('fill', function(d){return lineage[d.name].color;})
        .attr('opacity', 0.8)
	.attr('cx', function(d){return small_multiples_x_scale(-d.pred_z);})
	.attr('cy', function(d){return small_multiples_y_scale(-d.pred_y);})
	.transition().ease(ease).duration(duration)
        .attr("cx", function(row) {return small_multiples_x_scale(-row.z);})
        .attr("cy", function(row) {return small_multiples_y_scale(-row.y);})
	.attr('r', function(d) {
	    return (lineage[d.name].selected || !highlights) ? d.radius/15 : d.radius/25;
	});
}

/**
* Initializes axes for PCA plot, appending to #pcaDiv div element.
*/
function initializePCA() {
    var margin = {top: 10, right: 10, bottom: 10, left: 10},
	width = $('#pcaDiv').width() - margin.left - margin.right,
        height = $('#pcaDiv').height() - margin.top - margin.bottom;

    pca_scale_x = d3.scale.linear()
        .domain([-30, 10])
        .range([0, width]);

    pca_scale_y = d3.scale.linear()
        .domain([-15, 15])
        .range([0, height]);

    // Make the axes for the x-y chart
    var xyChart = d3.select('#pcaDiv')
	.append('svg')
	.attr('width', width + margin.left + margin.right)
	.attr('height', height + margin.top + margin.bottom)
	.attr('id', 'pcaChart');

    var main = xyChart.append('g')
	.attr('id', 'pca_data_points')
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

/*
    var g = main.append("g")
        .attr('id', 'pca_data_points');
*/
}

/**
* Plots points on the PCA plot. intializePCA must be called first.
* @param {d3 data selection} to_plot - A set of datapoints from d3, typically the enter() set so new points are plotted.
*/
function plotPCA(enter_selection) { 
    enter_selection.append("circle")
        .attr('class', 'pca_datapoint')
        .attr('id', function(d){return d.name})
        .attr('onclick', "calcGeneEnrichment($(this).attr('fill')); $('#geneModal').modal('show');")
        .attr('data-toggle', 'tooltip')
        .attr('title', function(d) {return d.name})
        .attr('data-trigger', 'hover')
        .attr('data-placement', 'left')
        .attr('data-html', 'true')
        .attr('container', 'body')
        .attr('data-container', 'body');

    // Add the popover behavior for cells
    $(document).ready(function(){
        $('.pca_datapoint').tooltip();   
    });
}

function updatePCA(update_selection, duration){
    update_selection
        .attr("r", function(d) {
            if(lineage[d.name].selected || !highlights){
                return d.pred_r/10;
            }else{
                return  d.pred_r/15;
            }
        })
        .attr("fill", function (d) {return lineage[d.name].color; } )
        .attr('opacity', 0.8)
        .attr("cx", function (d) { return pca_scale_x(d.pred_pc2); } )
        .attr("cy", function (d) { return pca_scale_y(d.pred_pc3); } )
	.transition().ease(ease).duration(duration)
        .attr("cx", function(row) {return pca_scale_x(row.pc2);})
        .attr("cy", function(row) {return pca_scale_y(row.pc3);})
	.attr('r', function(d) {
	    return (lineage[d.name].selected || !highlights) ? d.radius/15 : d.radius/25;
	});
}

/**
* Wrapper function that transitions all plots to a specified timepoint. Determines new data to plot and then passes along to individual plotting functions to update.
* @param {integer} time_point - Index of the timepoint to transition to
* @param {integer} duration - Duration of the smooth animation to transition datapoints in milliseconds
*/
//function plotData( time_point, duration ) {
function plotData( duration ){
    //Get the data for this timepoint
    timepoint_data = tpdata[cur_tpdata_idx]

    //Get all cell elements, and remove any that are no longer needed
    var datapoints = scene.selectAll(".datapoint").data(timepoint_data, function(d){return d.name + '_3d'})
    var small_multiples_datapoints_xy = d3.select('#xy_data_points').selectAll(".small_multiples_datapoint_xy").data( timepoint_data, function(d){return d.name + '_xy';});
    var small_multiples_datapoints_xz = d3.select('#xz_data_points').selectAll(".small_multiples_datapoint_xz").data( timepoint_data, function(d){return d.name + '_xz';});
    var small_multiples_datapoints_yz = d3.select('#yz_data_points').selectAll(".small_multiples_datapoint_yz").data( timepoint_data, function(d){return d.name + '_yz';});
    var pca_datapoints = d3.select('#pca_data_points').selectAll(".pca_datapoint").data( timepoint_data, function(d){return d.name + '_pca';});

    //remove old data points
    datapoints.exit().remove();
    small_multiples_datapoints_xy.exit().remove();
    small_multiples_datapoints_xz.exit().remove();
    small_multiples_datapoints_yz.exit().remove();
    pca_datapoints.exit().remove();

    //Plot the new points
    datapoints.enter().call(plot3DView);
    small_multiples_datapoints_xy.enter().call(plotXYSmallMultiple);
    small_multiples_datapoints_xz.enter().call(plotXZSmallMultiple);
    small_multiples_datapoints_yz.enter().call(plotYZSmallMultiple);
    pca_datapoints.enter().call(plotPCA);

    //Update the new/remaining points
    datapoints.call(updatePlot3D, duration);
    small_multiples_datapoints_xy.call(updateXYSmallMultiple, duration);
    small_multiples_datapoints_xz.call(updateXZSmallMultiple, duration);
    small_multiples_datapoints_yz.call(updateYZSmallMultiple, duration);
    pca_datapoints.call(updatePCA, duration);

    //update timepoint indicator on tree
    var cur_tp = tpdata[cur_tpdata_idx][0].tp;
    d3.select('#current_tp')
	.attr('transform', 'translate(' + newtree_x_scale_orig(0) + ' ' + newtree_y_scale_orig(cur_tp) + ')');
}

/****************************************************************
HELPER FUNCTIONS FOR DATA PARSING AND INITIALIZATION
****************************************************************/
/**
* Function to construct the name of a cell's parent based on the C. elegans
* cell naming conventions.
* @param {string} cellname - the name of the cell for which to find the parent
* @returns {string} parentname - the name of the parent cell
*/
function get_parent_name(cellname){
    if(cellname in blastpred){
        return blastpred[cellname];
    }else{
        return cellname.substr(0, cellname.length - 1);
    }
}

/**
* Comparator function to return lineage order of cell names
* @param {string} a - first cell name
* @param {string} b - second cell name
* @returns {int} cmpval - as required by the javascript array sort function,
*                         returns a value less than zero if a is "less than" b
*                         (i.e. comes before b in sort order), otherwise returns
*                         a value greater than zero.
*/
function lineageComparator(a,b){
    var astart = a.charAt(0),
    bstart = b.charAt(0),
    blastorder = 'AMECDPZ'
    if(astart === bstart){
        return a.localeCompare(b);
    }else{
        return blastorder.indexOf(astart) - blastorder.indexOf(bstart);
    }
}

/**
* Read in text data that is in csv format and parse it into the csvdata object.
* This function also populates the namemap array to allow lookups into the 
* time series data based on cell name, and the cellmap, which contains all 
* cell-level metadata.
* @param {text from file} csvdata_in - file text generated by a call to d3.text
*/
//globals to allow parseCSV to work even if a time point is split across csvs
var tp = 1;
var tpdata = [];
var tpnames = [];
function parseCSV(csvdata_in) {
    var rows = d3.csv.parseRows(csvdata_in);
    if(tp === 1){
        gene_names = $.trim(rows[0][rows[0].length - 1]).split(' ');
    }
    for (var i=1; i < rows.length; i++){
        row = rows[i];
        if(+row[1] != tp){
            csvdata[tp - 1] = tpdata.sort(function(a,b){
                return lineageComparator(a.meta.name, b.meta.name);
            });
            namemap[tp - 1] = tpnames.sort(function(a,b){
                return lineageComparator(a, b);
            });
            tp = +row[1];
            tpdata = [];
            tpnames = [];
        }
        //Set up cellmap in parallel with csvdata
        var cellname = row[0].trim().replace(/\s/g, '_');
        var cell;
        if(cellname in cellmap){
            cell = cellmap[cellname];
        }else{
            cell = {'name':cellname,
                    'birthtp':+row[6] - 1,
                    'lifespan':+row[7],
                    'parent':-1,
                    'children': [],
                    'selected':false,
                    'userselected':false,
                    'color':defaultColor
            };
            cellmap[cellname] = cell;
            if(cellname != 'P0'){
                var parent_name = get_parent_name(cellname);
                cellmap[cellname].parent = cellmap[parent_name];
                cellmap[parent_name].children.push(cellmap[cellname]);
            }
        }
        //assemble object for csvdata
        var expr_on = [];
        for(var c_idx=0; c_idx < row[10].length; c_idx++){
            if(row[10].charAt(c_idx) === '1'){
                expr_on.push(c_idx);
            }
        }

        tpdata.push({'x': +row[2],
                     'y': +row[3],
                     'z': +row[4] * 11.1,
                     'radius': +row[5],
//                     'pc1': +row[6],
                     'pc2': +row[8],
                     'pc3': +row[9],
                     'first_tp': cell.birthtp === tp - 1 ? -1 : csvdata[cell.birthtp][namemap[cell.birthtp].indexOf(cell.name)],
                     'expr':expr_on,
                     'pred': -1,
                     'succ': [],
                     'meta':cell
        });
        tpnames.push(cellname);
        
        //Set up predecessor/successor
        if(tp > 1){
            var pred_idx = namemap[tp - 2].indexOf(cellname);
            if(pred_idx === -1){
               pred_idx = namemap[tp - 2].indexOf(get_parent_name(cellname));
            }
            tpdata[tpdata.length - 1].pred = csvdata[tp - 2][pred_idx];
            csvdata[tp - 2][pred_idx].succ.push(tpdata[tpdata.length - 1]);
        }
    }
}

/**
* Takes a gene name, looks up its wormbase.org ID and constructs the url to
* the wormbase.org page about that gene.
* @param {string} gene - gene name for which the corresponding wormbase.org url
*                        should be generated
* @returns {string} url - the wormbase.org url for the info about that gene
*/
function makeWormBaseUrl(gene){
    var wb = wormbase_map[gene].wb_id;
    return 'http://www.wormbase.org/db/get?name=' + wb + ';class=Gene';
}

/**
* Reads in the csv file mapping gene names to wormbase.org IDs and stores this
* mapping in a global object, wormbase_map. The wormbase.org IDs are used to
* construct URLs for use in links where users can find more info about genes.
*/
function loadWormBaseIdMap(){
    var url = 'wormbase_id_map.csv';
    console.log(url)
    d3.text(url, function(id_map){
        var rows = d3.csv.parseRows(id_map);
        for(var i=1; i < rows.length; i++){
            //map gene name to wormbase id
            wormbase_map[rows[i][0]] = {'wb_id': rows[i][1]};
        }
    });
}

/**
* Function to calculate gene-specific metrics with respect to a particular 
* set of highlighted cells. When a user clicks on a rect in the gene expression
* plot this function is called with the color of that rect as a parameter. Then
* metrics for all the genes are calculated, and they are displayed in a sortable
* table in the geneModal modal dialog.
* @param {string} selcolor - color of the rect in hex format
*/
function calcGeneEnrichment(selcolor){
    var popsize = csvdata[timepoint % csvdata.length].length;
    var selrows = d3.selectAll('.exprPlot_data_point')
        .filter(function(d){
            return lineage[d.name].color === selcolor ? this : null;
        });
    var gene_name,
    gene_exp,
    gene_exp_sel,
    pval;
    for(var i=0; i < gene_names.length; i++){

        gene_name = gene_names[i];
        
        // Some gene names load with a period when they have a dash in the map, this normalizes names
        // to make sure gene names always match those in the map.
        if ( !(gene_name in wormbase_map)) {
          gene_name = gene_name.replace('.', '-')
        }

        gene_exp = $('._'+i);
        gene_exp_sel = selrows.selectAll('._'+i);
        wormbase_map[gene_name].frac_exp = gene_exp.length/popsize;
        wormbase_map[gene_name].frac_exp_sel = gene_exp_sel.size()/selrows.size();
        if(gene_exp.length === 0){
            pval = 1;
        }else{
            pval = jStat.hypgeom.pdf(gene_exp_sel.size(), popsize, 
                                     gene_exp.length,selrows.size());
            //Bonferroni correction for multiple testing
            pval *= gene_names.length;
            pval = pval > 1 ? 1 : pval;
        }
        wormbase_map[gene_name].pval = pval;
    }
    printGeneTable();
}

function calcGeneEnrichment(selcolor){
    var cur_tp = tpdata[cur_tpdata_idx]
    var query = url_base+'/cgi-bin/get_genes.py?timepoint=' + cur_tp[0].tp;
    cur_tp.forEach(function(item, index){
	if(lineage[item.name].selected == true && lineage[item.name].color == selcolor){
	    query += '&selected_cells='+item.name;
	}
    });
    console.log(query);

    $.getJSON(query, function(result){
	result.forEach(function(item, idx){
            var gene_name = !(item[0] in wormbase_map) ? item[0].replace('.', '-') : item[0];
	    wormbase_map[gene_name].frac_exp = item[1];
	    wormbase_map[gene_name].frac_exp_sel = item[2];
	    wormbase_map[gene_name].pval = item[3];
        });
	printGeneTable();
    });
}

/**
* Function to populate the modal dialog "geneModal", which contains a report on
* the enrichment of genes for a particular selection. 
* Triggered from calcGeneEnrichment.
*/
function printGeneTable(){
    var table = d3.select('#gene_report_body'), 
        row;
    table.selectAll('tr').remove();
    $('#gene_report').trigger("update");
    for(var gene in wormbase_map){
        row = table.append('tr')
        row.append('td').text(gene);
        row.append('td')
            .append('a')
            .attr('href', makeWormBaseUrl(gene))
            .attr('target', '_blank')
            .text(wormbase_map[gene].wb_id);
        row.append('td').text(wormbase_map[gene].frac_exp);
        row.append('td').text(wormbase_map[gene].frac_exp_sel);
        row.append('td').text(wormbase_map[gene].pval);
    }
    $('#gene_report').trigger("update");
    var sorting = [[4,0]];
    $('#gene_report').trigger("sorton", [sorting]);
}

/****************************************************************
INITIALIZATION AND CALLBACKS FOR VISUALIZATION
****************************************************************/

/**
* Handles play and pause of development by starting and stopping playback, changing playbackspeed, and changing play button text.
* @callback - callback function play/pause button
*/
var dev_interval = 1000;
function playpausedev(){
    var button = document.getElementById('playpause');
    if(button.innerHTML === "▶"){
        if(speed === "slow"){
	    dev_interval = 1000;
        }
        else if(speed === "medium"){
	    dev_interval = 500;
        }
        else if(speed === "fast"){
	    dev_interval = 250;
        }
        playback_id = setInterval(development, dev_interval);
        button.innerHTML = "▌▌";
    }else{
        clearInterval(playback_id);
        button.innerHTML = "▶";
    }
}

/**
* Resets the 3D view to the original orientation.
* @callback - callback function for Reset View button
*/
function resetView() {
  setViewpoint("isometric_view");
}


/**
* Sets the 3D viewpoint of the 3D plot to one of three predefined viewpoints relies on global variable currentViewpoint.
* @param {int} viewPoint - the id (isometric_view, top_view, side_view, back_view) of viewpoint to set 
* @callback - callback function for small multiples buttons
*/
function setViewpoint(viewPoint) {
    document.getElementById(viewPoint).setAttribute('set_bind','true');
    x3d.node().runtime.resetView();
}


function hideControls() {
    if(! controls_hidden) {
        controls_hidden = true;
        $('#divControls').animate({left: "-415"}, 500, function() {});
        $('#hide-controls').attr('value', '▶')
        $('#divPlot').animate({"margin-left": "0", width: "100%"}, 500, function() {resize();});
    } else {
        controls_hidden = false;
        $('#divControls').animate({left: "5"}, 500, function() {});
        $('#hide-controls').attr('value', '◀')
        var width = $('#divPlot').width()
        $('#divPlot').animate({"margin-left": "415", width: width - 415}, 500, function() {resize()});
    }
}

/**
* Calls plotData and updates the time point index
* to the next time point. Runs when a user presses
* 'play' on the development animation.
* @callback - This is a callback for the setInterval 
*             calls in playpausedev()
*/
function development() {
    if (ready && x3d.node() && x3d.node().runtime ) {
	if (cur_tpdata_idx == tpdata.length){
            cur_tpdata_idx = 1;
	}else{
            cur_tpdata_idx++;
	}
//	console.log('TP Idx: ' + cur_tpdata_idx);
	pickColor_and_setSelected();
        plotData(dev_interval);
        document.getElementById('timerange').value = cur_tpdata_idx;
    } else {
        console.log('x3d not ready.');
    }
}

/**
* Updates the timepoint variable to match the playback slider value and update plots accordingly
* @callback - is htis a callback?
*/
function updatetime() {
    timepoint = parseInt(document.getElementById('timerange').value, 10);
    cur_tpdata_idx = timepoint;
    pickColor_and_setSelected();
    plotData(500);
}

/****************************************************************
HELPER FUNCTIONS FOR LINEAGE TREE PLOTTING
****************************************************************/

/**
* Sets the various position properties of nodes in the lineage tree to make them appear in the right place.
* @callback - called to position nodes when distortion slider moves and on initial setup.
*/
var width = 2000;
function position_node(node) {
    node.attr("cx", function(d) {return treeXScale(d.x);})
        .attr("cx0", function(d) {return treeXScale(d.x);})
        .attr("x", function(d) {return treeXScale(d.x);})
        .attr("x0", function(d) {return treeXScale(d.x);})
        .attr("y", function(d) {return d.y;})
        .attr("y0", function(d) {return d.y;});
}

/**
* Sets the radius of nodes in the lineage tree to scale larger towards the center of the lineage tree plot.
* @callback - called to set radius when distortion slider moves and on initial setup.
*/
function scale_radius(circle, maxCircleRadius, minCircleRadius) {
    circle.attr("r", function(d) {
        var currentPosition = treeXScale(d.x)
        if (d.depth <= 2) { 
            return maxCircleRadius
        } else {
            return Math.max(maxCircleRadius * (-4/Math.pow(width, 2) * Math.pow(currentPosition, 2) + 4 / width * currentPosition), minCircleRadius)
        } 
    });
  }

d3.select(window).on('resize', resize);

function resize(){
    resizeSmallMultiples();
    resizePCAPlot();
    resizeLineageTree();
}

function resizeSmallMultiples(){
    var width = $('#small_multiples').width(),
	height = Math.floor($('#small_multiples').height()/3);
    var scaleSet = Math.min(width, height);

    var xmargin = (width - scaleSet)/2;
    small_multiples_x_scale.range([0 + xmargin, width - xmargin]);

    var ymargin = (height - scaleSet)/2;
    small_multiples_y_scale.range([0 + ymargin, height - ymargin]);
 
    d3.selectAll('.small_multiples_datapoint_xy')
        .attr("cx", function (d) { return small_multiples_x_scale(d.x); } )
        .attr("cy", function (d) { return small_multiples_y_scale(-d.y); } )

    d3.selectAll('.small_multiples_datapoint_xz')
        .attr("cx", function (d) { return small_multiples_x_scale(-d.z); } )
        .attr("cy", function (d) { return small_multiples_y_scale(d.x); } )

    d3.selectAll('.small_multiples_datapoint_yz')
        .attr("cx", function (d) { return small_multiples_x_scale(-d.z); } )
        .attr("cy", function (d) { return small_multiples_y_scale(-d.y); } )
}

function resizePCAPlot(){
    var margin = {top: 10, right: 10, bottom: 10, left: 10},
	width = $('#pcaDiv').width() - margin.left - margin.right,
        height = $('#pcaDiv').height() - margin.top - margin.bottom;

    pca_scale_x.range([0, width]);
    pca_scale_y.range([0, height]);

    //set dimensions of the PCA SVG
    d3.select('#pcaChart')
	.attr('width', width + margin.left + margin.right)
	.attr('height', height + margin.top + margin.bottom);
    
    d3.selectAll('.pca_datapoint')
        .attr("cx", function (d) { return pca_scale_x(d.pc2); } )
        .attr("cy", function (d) { return pca_scale_y(d.pc3); } );
}

function resizeLineageTree(){
    var margin = {top: 10, right: 10, bottom: 10, left: 10},
	width = $('#lineage_tree').width() - margin.left - margin.right,
	height = $('#lineage_tree').height() - margin.top - margin.bottom;

    newtree_x_scale.range([0, width]);
    newtree_y_scale.range([0, height]);

/*Need these to stay the same because the paths we already
drew need to stay so we don't have to re-render the entire 
tree on each resize event.
    newtree_x_scale_orig.range([0, width]);
    newtree_y_scale_orig.range([0, height]);
*/
    d3.select('#tree_svg')
	.attr('width', width + margin.left + margin.right)
	.attr('height', height + margin.top + margin.bottom);
    d3.select('#tree_rect')
	.attr('width', width)
	.attr('height', height);
}

/****************************************************************
* INITIALIZE NEW LINEAGE TREE
*****************************************************************
* Just plot the whole tree based on the lineage data structure
*/
var newtree_x_scale, newtree_y_scale
var newtree_x_scale_orig, newtree_y_scale_orig
var zoom;//, zoom_translate=[0,0], zoom_scale=1;
var tree_container, paths_container;
//var tree_init_scale, tree_init_tranlate;
function initializeLineageTree2(){
    var tree_div = d3.select(".lineage_tree"),
	d = calcTreeDims();

    newtree_x_scale = d3.scale.linear()
        .domain([0, lineage['P0'].rgt])
        .range([0, d.scale_width]);
    newtree_x_scale_orig = newtree_x_scale.copy();

    newtree_y_scale = d3.scale.linear()
        .domain([0, 550])
        .range([0, d.scale_height]);
    newtree_y_scale_orig = newtree_y_scale.copy();

    zoom = d3.behavior.zoom()
        .x(newtree_x_scale)
        .y(newtree_y_scale)
        .scaleExtent([0.1, 15])
        .size([d.viz_width, d.viz_height])
        .on("zoom", zoomed);

    // Set up the SVG element
    var svg = tree_div
        .append("svg")
        .attr('id', 'tree_svg')
        .attr("width", d.viz_width + d.margin.left + d.margin.right)
        .attr("height", d.viz_height + d.margin.top + d.margin.bottom);

    tree_container = svg
        .append("g")
        .attr('id', 'lineagetree2')
        .attr('transform', 'translate(' + d.margin.left + ',' + d.margin.top + ')')
        .style('overflow', 'hidden');

    tree_container.append("rect")
        .attr('id', 'tree_rect')
        .attr("width", d.viz_width)
        .attr("height", d.viz_height)
        .style('fill', 'none')
        .style("pointer-events", "all");

    paths_container = tree_container.append('g')

    //add a horizontal line to indicate the current timepoint
    paths_container.append('path')
        .attr('id', 'current_tp')
        .attr('d', 'M0 0 H' + d.scale_width)
        .attr('stroke', '#aaaaaa')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', "5,5");

    drawLineageTree2();

    tree_container.call(zoom);

//    zoom_translate = d.init_translate;
//    zoom_scale = d.init_scale;
    zoom.translate(d.init_translate).scale(d.init_scale);
    zoomed(d.init_translate, d.init_scale);
}

function zoomed(t, s) {
    if(d3.event !== null){
	t = d3.event.translate;
	s = d3.event.scale;
    }
//    zoom_tranlate = t;
//    zoom_scale = s;
    console.log('Trans: ' + t + ' ' + 'Scale: ' + s);
    paths_container.attr("transform", "translate(" + t + ")scale(" + s + ")");
    paths_container.select('#current_tp').attr('stroke-width', 2/s);
    paths_container.selectAll('.treeln_path').attr('stroke-width', 1/s);
    paths_container.selectAll('.highlight_treeln_path').attr('stroke-width', 1/s)
//	.attr('transform','translate(' + t + ')scale(' + s + ')');
    if(s > 5){
	paths_container.selectAll('.tree_text1').attr("visibility", 'visible');
	paths_container.selectAll('.tree_text2').attr("visibility", 'visible');
	paths_container.selectAll('.tree_text3').attr("visibility", 'visible');
    }else if(s > 3){
	paths_container.selectAll('.tree_text1').attr("visibility", 'visible');
	paths_container.selectAll('.tree_text2').attr("visibility", 'visible');
	paths_container.selectAll('.tree_text3').attr("visibility", 'hidden');
    }else if(s > 1){
	paths_container.selectAll('.tree_text1').attr("visibility", 'visible');
	paths_container.selectAll('.tree_text2').attr("visibility", 'hidden');
	paths_container.selectAll('.tree_text3').attr("visibility", 'hidden');
    }else{
	paths_container.selectAll('.tree_text1').attr("visibility", 'hidden');
	paths_container.selectAll('.tree_text2').attr("visibility", 'hidden');
	paths_container.selectAll('.tree_text3').attr("visibility", 'hidden');
    }
}

function calcTreeDims(){
    var margin = {top: 10, right: 10, bottom: 10, left: 10},
	viz_width = $('#lineage_tree').width() - margin.left - margin.right,
	viz_height = $('#lineage_tree').height() - margin.top - margin.bottom,
	scale_width = 1480, scale_height=420,
	init_scale = Math.min(viz_width/scale_width, viz_height/scale_height),
	init_center_x = Math.abs(scale_width*init_scale - viz_width)/2,
	init_center_y = Math.abs(scale_height*init_scale - viz_height)/2,
	init_translate = [margin.left + init_center_x, margin.top + init_center_y];

    console.log('Scale width: ' + scale_width + " Scale height: " + scale_height + " Init scale: " + init_scale);
    console.log('Init x: ' + init_center_x + ' Init y: ' + init_center_y);
    return {'margin':margin, 'viz_width':viz_width, 'viz_height':viz_height,
	    'scale_width':scale_width, 'scale_height':scale_height,
	    'init_scale':init_scale, 'init_translate':init_translate};
}

function resetTree(){
    d = calcTreeDims();
//    zoom_translate = d.init_translate;
//    zoom_scale = d.init_scale;
    zoom.translate(d.init_translate).scale(d.init_scale);
    zoomed(d.init_translate, d.init_scale);
}

function drawLineageTree2(){
    //associate the cells with svg g elements
    var lincells = Object.values(lineage);

    var treedata = paths_container.selectAll('.treeln_path')
        .data(lincells, function(d){return d.cell_name;})
        .enter();

    var path_fmt = 'M{0} {1} L{2} {3} V{4}'
    treedata.append('path')
        .attr('id', function(d){return d.cell_name + '_treeln_path';})
        .attr('class', 'treeln_path')
        .attr('d', function(d){
	    if(d.cell_name == 'P0'){
		return 'M{0} {1} V{2}'.format(newtree_x_scale((d.lft + d.rgt)/2),
					      newtree_y_scale(d.birth),
					      newtree_y_scale(d.death));
	    }else{
		var parent = lineage[d.parent_name];
		return path_fmt.format(newtree_x_scale((parent.lft + parent.rgt)/2),
				       newtree_y_scale(parent.death),
				       newtree_x_scale((d.lft + d.rgt)/2),
				       newtree_y_scale(d.birth),
				       newtree_y_scale(d.death));
	    }
	})
        .attr('stroke', function(d){return d.color;})
        .attr('stroke-width', 1)
        .attr('fill', 'none');

    // Add text labels to each node
    var thresholds = [lineage['Eal'].death, lineage['ABalpappp'].death];
    var text = paths_container.selectAll('text')
        .data(lincells, function(d){return d.cell_name;}).enter()
        .append('text')
        .attr('class', function(d){
	    if(d.birth < thresholds[0]){
		return 'tree_text1';
	    }else if(d.birth < thresholds[1]){
		return 'tree_text2';
	    }else{
		return 'tree_text3';
	    }
	})
        .text(function(d) {return d.cell_name})
        .attr('x', function(d) {return newtree_x_scale((d.lft + d.rgt)/2);})
        .attr('y', function(d) {return newtree_y_scale(d.birth);})
        .attr('text-anchor', 'end')
        .attr('alignment-baseline', function(d) {
	    if( (d.cell_name == 'P0') ||
		((d.lft - lineage[d.parent_name].lft) < (lineage[d.parent_name].rgt - d.rgt)) ){
		return 'after-edge';
            }else{
		return 'before-edge';
	    }
	})
    //Note: the font size has to be set here so that it will properly scale with zooming
        .attr('font-size', function(d){
	    if(d.birth < thresholds[0]){
		return 5;
	    }else if(d.birth < thresholds[1]){
		return 2;
	    }else{
		return 1;
	    }
	})
        .attr('transform', function(d) {
	    var ycorrect;
	    if(d.birth < thresholds[0]){
		ycorrect = 0.5;
	    }else if(d.birth < thresholds[1]){
		ycorrect = 0.2
	    }else{
		ycorrect = 0.2
	    }
	    return 'rotate(-90 {0} {1})'.format(newtree_x_scale((d.lft + d.rgt)/2),
						newtree_y_scale(d.birth) + ycorrect);})
        .attr('visibility', 'hidden');
}

/****************************************************************
Try asynchronous loading of data on-demand
****************************************************************/
/*
* Adds a sort of "Python-style" string formatting. 
*
* "{0} is dead, but {1} is alive! {0} {2}".format("ASP", "ASP.NET")
* outputs
* ASP is dead, but ASP.NET is alive! ASP {2}
*
* Thanks to Stack Overflow:
* http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
*/
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

/*
function loadTimePoints(file_idx){
    var url = 'exprTable/ImageExpressionTable.lifespan.timesort.fixed.centered.binary.clustered.pca.expstr.' + file_idx + '.csv';
    console.log(url);
    d3.text(url, function(tpdata){
        if(!tpdata){
            ready = true;
            d3.select('#timerange').attr('max', csvdata.length - 1);
            //load cell type data
            loadCellTypeMap();
            return;
        }
        parseCSV(tpdata);
        loadTimePoints(file_idx + 1);
    });
}
*/

//global time point index into tpdata
var cur_tpdata_idx = 0
var num_tps = 10
var total_tps = 548
var url_base = '{0}//{1}'.format(window.location.protocol, window.location.hostname);
console.log('url_base: '+url_base);
var cgi_url = url_base + '/cgi-bin/get_tp.py?rangelow={0}&rangehigh={1}';
function loadTimePoint(timepoint_idx, plot){
    var query = cgi_url.format(timepoint_idx, timepoint_idx + num_tps)
    console.log(query);
    $.getJSON(query,  function(result){
    if(plot){
        tpdata = result;
        plotData(500);
    } else {
            tpdata = result.concat(tpdata);
    }
    console.log(tpdata.length);
    console.log(result.length);
    ready=true;
    return;
    });
}

function loadTimePointPromise(start_tp, loadnum){
    return new Promise(function(resolve, reject) {
	var query = cgi_url.format(start_tp, start_tp + loadnum)
	$.getJSON(query, function(result){
            for (var i=0; i < result.length; i++){
		tpdata.push(result[i]);
            }
            d3.select('#timerange').attr('max', tpdata.length - 1);
            ready=true;
            resolve('Loaded!');
	});
    });
}

function loadTimePoints(){
    var loadlist = [];
    var loadnum = 20;
    for (var i=loadnum + 1; i < total_tps; i += loadnum){
    loadlist.push(i);
    }
    //initialize promise sequence for loading time point location data
    //and plot the initial data
    var tpPromise = loadTimePointPromise(1, loadnum).then(function(){
	plotData(500);
	//take away the spinner now that everything is initialized and
	//there is some data to look at
	$('body').unblock();
	return Promise.resolve();
    });
    //finish compiling the sequence of time point promises
    loadlist.forEach(function(next_tp){
    //queue loading of time point data into a sequence
    tpPromise = tpPromise.then(function() {
        return loadTimePointPromise(next_tp, loadnum);
    });
    });
    tpPromise.then(function() {
    d3.select('#timerange').attr('max', total_tps);
    });
}

/****************************************************************
Main Thread of execution
****************************************************************/
function scatterPlot3d( parent ) {
    //make loading spinner on whole page
    $.blockUI.defaults.css = {};
    $('body').block({message: '<div id="loading_spinner"></div>'});
    x3d = d3.select('x3d')
    scene = x3d.append("scene")

    /* Define the four different viewpoints (ISO and each of the small multiples)
       Note: to set a new viewpoint, the best way to get the coordinates is to
       load the visualization, click on the 3D plot to put the mouse focus there,
       and then press the d key to bring up the X3DOM debugger. Then, you can 
       rotate the view to your desired viewpoint and press the v key to print
       the parameters of the current viewpoint to the X3DOM debugger console.
       Also note that the debugger console appears below the scene, so to see it
       I had to go into the Chrome dev tools and change the height of the top_panel
       div to 100% instead of 50%.
    */
    scene.append("orthoviewpoint")
        .attr( "centerOfRotation", [0, 0, 0])
        .attr( "fieldOfView", [-500, -500, 500, 500])
        .attr( "orientation", [-0.5, 1, 0.2, 1.12*Math.PI/4])
        .attr( "position", [600, 300, 600])
        .attr('id', 'isometric_view');

    scene.append("orthoviewpoint")
        .attr( "centerOfRotation", [0, 0, 0])
        .attr( "fieldOfView", [-500, -500, 500, 500])
        .attr( "orientation", [0, 0, 0, 0])
        .attr( "position", [0, 0, 800])
        .attr('id', 'side_view');

    scene.append("orthoviewpoint")
        .attr( "centerOfRotation", [0, 0, 0])
        .attr( "fieldOfView", [-500, -500, 500, 500])
        .attr( "orientation", [-0.58094, 0.57446, 0.57663, 2.09156])
        .attr( "position", [0, 800, 0])
        .attr('id', 'top_view');

    scene.append("orthoviewpoint")
        .attr( "centerOfRotation", [0, 0, 0])
        .attr( "fieldOfView", [-500, -500, 500, 500])
        .attr( "orientation", [0, 1.5, 0, 3.14/2])
        .attr( "position", [800, 0, 0])
        .attr('id', 'back_view');

    //make sure that the selection form submit button works
    $('#selectForm').on("submit",  function (event) {
	event.preventDefault();
	setSelection();
    });

    console.log("Loading data");
    //Load lineage data structure
    var getlineageurl = url_base + '/cgi-bin/get_lineage.py?color='+encodeURIComponent(defaultColor)
    var getlineage = new Promise(function(resolve, reject){
	$.getJSON(getlineageurl, function(result){
            if(result){
		lineage = result;
		resolve('Lineage loaded.');
            }else{
		reject(Error('Something went wrong while loading lineage.'));
            }
	});
    })
    //Then load everything else
    getlineage.then(function(response){
	loadCellTypeMap();
	loadTimePoints();
	loadWormBaseIdMap();
    });

    d3.select('#hide-controls')
      .attr('onclick', 'hideControls();');

    d3.select('#reset-button')
      .attr('onclick', 'resetView()');

    d3.select('#tree-reset-button')
	.attr('onclick', 'resetTree()');

    // Add play button for time points
    d3.select('#playpause')
        .attr('onclick', "playpausedev()")

    // Add slider for time points
    d3.select('#timerange')
        .attr('defaultValue', 0)
        .attr('min', 0)
        .attr('step', 1)
        .attr('value', 0)
        .attr('onchange', 'updatetime()');
           
    d3.select('body').select('select')
        .on("change", function(d) {speed = this.value;});
}
