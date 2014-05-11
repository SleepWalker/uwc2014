<div class="row">
  <h1 class="col-md-12">Filtering Demo</h1>
</div>
<div class="row">
  <div class="col-md-12">
    <button class="btn btn-primary btn-block choose-image">Choose or Drag Image</button>
    <input type="file" id="fileField" style="display: none" />
  </div>
</div>
<div class="row row-tools">
  <div class="col-md-6">
    <button class="btn btn-success btn-block save">Save</button>
  </div>
  <div class="col-md-6">
    <button class="btn btn-danger btn-block reset">Reset</button>
  </div>
</div>

<div class="row row-tools">
  <div class="btn-group col-md-12">
    <button type="button" class="btn btn-default btn-block dropdown-toggle" data-toggle="dropdown">
      Add Filter <span class="caret"></span>
    </button>
    <ul class="dropdown-menu filter-menu col-md-12" role="menu">
    </ul>
  </div>
</div>

<div class="row">
  <div id="filter-stack" class="col-md-12"></div>
</div>

<div class="gui-dropzone"><h3>Drop files here</h3></div>