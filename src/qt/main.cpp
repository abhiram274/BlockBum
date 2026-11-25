#include "mainwindow.hpp"
#include <QApplication>
#include <QFile>
#include <QTextStream>
#include <iostream>

int main(int argc, char* argv[]) {
    QApplication app(argc, argv);
    app.setApplicationName("BlockBum Core");
    app.setApplicationVersion("0.2.0");
    app.setOrganizationName("BlockBum Network");

    // Load custom Orange, White, Gold, and Obsidian Stylesheet
    QFile style_file(":/style.qss");
    if (!style_file.exists()) {
        // Fallback to loading from disk
        style_file.setFileName("style.qss");
    }
    if (style_file.open(QFile::ReadOnly | QFile::Text)) {
        QTextStream stream(&style_file);
        app.setStyleSheet(stream.readAll());
        style_file.close();
    }

    blockbum::qt::MainWindow main_win;
    main_win.show();

    return app.exec();
}
