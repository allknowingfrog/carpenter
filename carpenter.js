function carpenter() {
    //DOM ACCESSOR FUNCTIONS
    function base10(value) {
        return parseInt(value, 10);
    }

    function getInt(cell, attribute) {
        return base10(cell.attr(attribute));
    }

    function getRow(cell) {
        return getInt(cell, 'data-carpenter-row');
    }

    function setRow(cell, value) {
        cell.attr('data-carpenter-row', value);
    }

    function getCol(cell) {
        return getInt(cell, 'data-carpenter-col');
    }

    function setCol(cell, value) {
        cell.attr('data-carpenter-col', value);
    }

    function getId(cell) {
        return cell.attr('data-carpenter-id');
    }

    function setId(cell, value) {
        cell.attr('data-carpenter-id', value);
    }

    function getColspan(cell) {
        var colspan = cell.prop('colspan');

        return colspan ? base10(colspan) : 1;
    }

    function setColspan(cell, value) {
        cell.prop('colspan', value);
    }

    function incrementColspan(cell, increment) {
        setColspan(cell, getColspan(cell) + increment);
    }

    function getRowspan(cell) {
        var rowspan = cell.prop('rowspan');

        return rowspan ? base10(rowspan) : 1;
    }

    function setRowspan(cell, value) {
        cell.prop('rowspan', value);
    }

    function incrementRowspan(cell, increment) {
        setRowspan(cell, getRowspan(cell) + increment);
    }

    function getWidth(col) {
        return getInt(col, 'data-carpenter-width');
    }

    function setWidth(col, value) {
        col.attr('data-carpenter-width', value);
        col.css('width', value + '%');
    }

    function incrementWidth(col, increment) {
        setWidth(col, getWidth(col) + increment);
    }

    //MAPPING FUNCTIONS
    /* populate a two-dimensional array representing every possible cell in the
     * html table, indexed by row then column; each location contains a jQuery
     * object representing that position in the table; multiple locations in the
     * array may point to the same jQuery object if that cell contains a colspan
     * or rowspan greater than 1
     */
    function map(cell) {
        var table = cell.closest('table');
        var columns = table.find('> colgroup > col');
        var rows = table.find('> tbody > tr');
        var cellMap = [];
        rows.each(function() {
            cellMap.push(new Array(columns.length));
        });

        var rIndex = 0;
        rows.each(function() {
            var cells = $(this).find('> td');
            var cIndex = 0;
            cells.each(function() {
                var cell = $(this);
                while(true) {
                    //rowspans in previous rows may occupy positions in this row
                    if(typeof(cellMap[rIndex][cIndex]) == 'object') {
                        cIndex++;
                    } else {
                        break;
                    }
                }

                var colspan = getColspan(cell);
                var rowspan = getRowspan(cell);

                setRow(cell, rIndex);
                setCol(cell, cIndex);

                for(var r=0; r<rowspan; r++) {
                    for(var c=0; c<colspan; c++) {
                        cellMap[rIndex+r][cIndex+c] = cell;
                    }
                }
                cIndex += colspan;
            });
            rIndex++;
        });

        return cellMap;
    }

    function column(cell) {
        var cellMap = map(cell);

        return cell.closest('table').find('> colgroup > col').eq(getCol(cell));
    }

    function bottomLeftNeighbor(cell, rIndex, cIndex) {
        var rows = cell.closest('table').find('> tbody > tr');

        var nRow = rows.eq(rIndex);
        var neighbor;
        //find the last cell left of this one in the next row down
        nRow.find('> td').each(function() {
            if(getCol($(this)) < cIndex) neighbor = $(this);
            else return false;
        });

        return neighbor;
    }

    //LAYOUT FUNCTIONS
    function expand(col, inverted, increment) {
        var target = inverted ? col.next('col') : col.prev('col');
        var twidth = getWidth(target) - increment;
        if(twidth > 0) {
            var cwidth = getWidth(col) + increment;
            if(cwidth > 0) {
                setWidth(target, twidth);
                setWidth(col, cwidth);
            }
        }
    }

    function expandRow(cellMap, rIndex) {
        var cells = cellMap[rIndex];
        var visited = [];
        var testCell;
        for(var c=0; c<cells.length; c++) {
            testCell = cells[c];
            if(visited.indexOf(testCell) == -1) {
                visited.push(testCell);
                incrementRowspan(testCell, 1);
            }
        }
    }

    function collapseRow(cell, rIndex, increment) {
        if(increment != -1) increment = 1;

        var cellMap = map(cell);
        var rows = cell.closest('table').find('> tbody > tr');

        var row = rows.eq(rIndex);
        if(row.find('> td').length == 0) {
            row.remove();
            var visited = [];
            var cells = cellMap[rIndex + increment];
            var testCell;
            for(var c=0; c<cells.length; c++) {
                testCell = cells[c];
                if(visited.indexOf(testCell) == -1) {
                    visited.push(testCell);
                    incrementRowspan(testCell, -1);
                }
            }
        }
    }

    function collapseColumn(cellMap, cIndex, increment) {
        if(increment != -1) increment = 1;

        var merge = true;
        for(var i in cellMap) {
            var row = cellMap[i];
            if(row[cIndex] != row[cIndex + increment]) {
                merge = false;
                break;
            }
        }

        if(merge) {
            var visited = [];
            var testCell;
            for(var i in cellMap) {
                testCell = cellMap[i][cIndex + increment];
                if(visited.indexOf(testCell) == -1) {
                    visited.push(testCell);
                    incrementColspan(testCell, -1);
                }
            }
            var columns = table.find('> colgroup > col');
            var col = columns.eq(cIndex);
            var nCol = columns.eq(cIndex + increment);
            incrementWidth(col, getWidth(nCol));
            nCol.remove();
        }
    }

    function split(cell, horizontal, inverted) {
        var cellMap = map(cell);

        var rIndex = getRow(cell);
        var cIndex = getCol(cell);

        var rows = cell.closest('table').find('> tbody > tr');

        //vertical
        if(!horizontal) {
            //up
            if(!inverted) {
                if(getRowspan(cell) == 1) {
                    expandRow(cellMap, rIndex);
                    var newCell = cell.clone(true);
                    setRowspan(cell, 1);
                    incrementRowspan(newCell, -1);
                    cell.after(newCell);
                    var newRow = $("<TR></TR>").append(cell);
                    newCell.parent().after(newRow);
                    var tmp = cell;
                    cell = newCell;
                    newCell = tmp;
                } else {
                    incrementRowspan(cell, -1);
                    rIndex++;
                    var newCell = cell.clone(true).prop('rowspan', 1);
                    if(cIndex > 0) {
                        neighbor = bottomLeftNeighbor(cell, rIndex, cIndex);
                        cell.after(newCell);
                        neighbor.after(cell);
                    } else {
                        cell.after(newCell);
                        rows.eq(rIndex).prepend(cell);
                    }
                }
            //down
            } else {
                if(getRowspan(cell) == 1) {
                    expandRow(cellMap, rIndex);
                    incrementRowspan(cell, -1);
                    var newCell = cell.clone(true).prop('rowspan', 1);
                    var newRow = $("<TR></TR>").append(newCell);
                    rows.eq(rIndex).after(newRow);
                } else {
                    incrementRowspan(cell, -1);
                    rIndex += getRowspan(cell);
                    var newCell = cell.clone(true).prop('rowspan', 1);
                    if(cIndex > 0) {
                        neighbor = bottomLeftNeighbor(cell, rIndex, cIndex);
                        neighbor.after(newCell);
                    } else {
                        rows.eq(rIndex).prepend(newCell);
                    }
                }
            }

        //horizontal
        } else {
            if(getColspan(cell) == 1) {
                var columns = cell.closest('table').find('> colgroup > col');
                var col = columns.eq(cIndex);
                var width = getWidth(col);
                var left = parseInt(Math.ceil(width/2), 10);
                col.width(left+'%');
                setWidth(col, left);
                col.text(left);
                var newCol = col.clone();
                var right = Math.floor(width/2);
                newCol.width(right+'%');
                setWidth(newCol, right);
                newCol.text(right);
                col.after(newCol);

                var visited = [];
                var testCell;
                for(var r in cellMap) {
                    testCell = cellMap[r][cIndex];
                    if(visited.indexOf(testCell) == -1) {
                        visited.push(testCell);
                        incrementColspan(testCell, 1);
                    }
                }
            }

            incrementColspan(cell, -1);

            var newCell = cell.clone(true).prop('colspan', 1);

            inverted ? cell.after(newCell) : cell.before(newCell);
        }
    }

    function merge(cell, horizontal, inverted) {
        var cellMap = map(cell);

        var rIndex = getRow(cell);
        var cIndex = getCol(cell);

        //vertical
        if(!horizontal) {
            //up
            if(!inverted) {
                var nIndex = rIndex - 1;
                if(nIndex >= 0) {
                    var neighbor = cellMap[nIndex][cIndex];
                    if(
                        neighbor && getColspan(neighbor) == getColspan(cell) &&
                        (cIndex == 0 || cellMap[nIndex][cIndex-1] != neighbor)
                    ) {
                        incrementRowspan(cell, getRowspan(neighbor));
                        neighbor.after(cell);
                        neighbor.remove();
                    }

                    collapseRow(cell, rIndex, -1);
                }
            //down
            } else {
                var nIndex = rIndex + getRowspan(cell);
                if(nIndex < cellMap.length) {
                    var neighbor = cellMap[nIndex][cIndex];
                    if(
                        neighbor && getColspan(neighbor) == getColspan(cell) &&
                        (cIndex == 0 || cellMap[nIndex][cIndex-1] != neighbor)
                    ) {
                        incrementRowspan(cell, getRowspan(neighbor));
                        neighbor.remove();
                    }

                    collapseRow(cell, nIndex, -1);
                }
            }

        //horizontal
        } else {
            var increment = 0;
            var merge = true;
            var neighbor, nIndex;

            //left
            if(!inverted) {
                increment = 1;
                neighbor = cell.prev();
                nIndex = cIndex - 1;

            //right
            } else {
                increment = -1;
                neighbor = cell.next();
                nIndex = getCol(neighbor);
            }

            if(neighbor && getRowspan(neighbor) == getRowspan(cell)) {
                incrementColspan(cell, getColspan(neighbor));
                neighbor.remove();
            }

            cellMap = map(cell);
            for(var i in cellMap) {
                var row = cellMap[i];
                if(row[nIndex] != row[nIndex + increment]) {
                    merge = false;
                    break;
                }
            }

            if(merge) {
                var visited = [];
                var testCell;
                for(var i in cellMap) {
                    testCell = cellMap[i][nIndex + increment];
                    if(visited.indexOf(testCell) == -1) {
                        visited.push(testCell);
                        incrementColspan(testCell, -1);
                    }
                }
                var columns = cell.closest('table').find('> colgroup > col');
                var col = columns.eq(nIndex + increment);
                var nCol = columns.eq(nIndex);
                incrementWidth(col, getWidth(nCol));
                nCol.remove();
            }
        }
    }

    //PUBLIC METHODS
    this.splitUp = function(cell) {
        split(cell, false, false);
    };

    this.splitDown = function(cell) {
        split(cell, false, true);
    };

    this.splitLeft = function(cell) {
        split(cell, true, false);
    };

    this.splitRight = function(cell) {
        split(cell, true, true);
    };

    this.mergeUp = function(cell) {
        merge(cell, false, false);
    };

    this.mergeDown = function(cell) {
        merge(cell, false, true);
    };

    this.mergeLeft = function(cell) {
        merge(cell, true, false);
    };

    this.mergeRight = function(cell) {
        merge(cell, true, true);
    };

    this.expandLeft = function(cell, increment) {
        expand(column(cell), false, increment);
    };

    this.expandRight = function(cell, increment) {
        expand(column(cell), true, increment);
    };

    this.splitRow = function(cell, dir) {
        var cellMap = map(cell);

        var rIndex = getRow(cell);

        var visited = [];
        var testCell;
        for(var i in cellMap[rIndex]) {
            testCell = cellMap[rIndex][i];
            if(visited.indexOf(testCell) == -1) {
                visited.push(testCell);
            }
        }
        for(var i in visited) {
            split(cell, dir, visited[i]);
        }
    };

    this.removeRow = function(cell) {
        var cellMap = map(cell);

        var rIndex = getRow(cell);
        var cIndex = getCol(cell);

        var rows = table.find('> tbody > tr');

        var row = rows.eq(rIndex);

        var visited = [];
        var testCell, rowspan;
        for(var i in cellMap[rIndex]) {
            testCell = cellMap[rIndex][i];
            if(visited.indexOf(testCell) == -1) {
                visited.push(testCell);
                getRowspan(testCell) <= 1 ? testCell.remove() : incrementRowspan(testCell, -1);
            }
        }
        row.remove();

        cellMap = map(cell);

        var columns = cell.closest('table').find('> colgroup > col');

        for(var c=columns.length-1; c>0; c--) {
            collapseColumn(cellMap, c, -1);
        }
    };

    this.debug = function(cell) {
        var cellMap = map(cell);

        var nextID = 1;

        var table = cellMap[0][0].closest('table');

        table.find('> tbody > tr > td').each(function() {
            setId($(this), nextID);
            nextID++;
        });

        var debugMap = [];
        var visited = [];
        var row, cell;
        for(var r=0; r<cellMap.length; r++) {
            row = cellMap[r];
            debugMap.push(new Array(row.length));
            for(var c=0; c<row.length; c++) {
                cell = row[c];
                if(visited.indexOf(cell) == -1) visited.push(cell);
                debugMap[r][c] = getId(cell);
            }
        }
        console.log(
            JSON.stringify(debugMap).replace(/\],\[/g, "\n").replace("[[", "").replace("]]", "")
        );
    };
}
