#pragma once

#include <QDialog>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>

namespace blockbum::qt {

class ReceiveCoinsDialog : public QDialog {
    Q_OBJECT

public:
    explicit ReceiveCoinsDialog(const QString& address, QWidget* parent = nullptr);

private slots:
    void copyAddress();

private:
    void setupUi();

    QString address_;
    QLineEdit* address_edit_{nullptr};
};

} // namespace blockbum::qt
