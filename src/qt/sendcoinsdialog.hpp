#pragma once

#include <QDialog>
#include <QLineEdit>
#include <QPushButton>
#include <QLabel>
#include <QVBoxLayout>

namespace blockbum::qt {

class SendCoinsDialog : public QDialog {
    Q_OBJECT

public:
    explicit SendCoinsDialog(QWidget* parent = nullptr);

signals:
    void coinsSent(const QString& recipient, double amount, double fee);

private slots:
    void handleSend();

private:
    void setupUi();

    QLineEdit* recipient_edit_{nullptr};
    QLineEdit* amount_edit_{nullptr};
    QLineEdit* fee_edit_{nullptr};
    QLabel* status_label_{nullptr};
};

} // namespace blockbum::qt
