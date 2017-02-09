_context.invoke('Nittro.Extras.CheckList.Bridges.CheckListDI', function () {

    var CheckListExtension = _context.extend('Nittro.DI.BuilderExtension', function (containerBuilder, config) {
        CheckListExtension.Super.call(this, containerBuilder, config);
    }, {
        load: function () {
            this._getContainerBuilder().addFactory('checkList', 'Nittro.Extras.CheckList.CheckList()');

        }
    });

    _context.register(CheckListExtension, 'CheckListExtension');

});
